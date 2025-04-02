#include <soc/sens_reg.h> //les lib bas niveau pour pouvoir recréer une version bas niveau + IRAM d'analogRead afin de pouvoir l'appeler depuis un interupt
#include <soc/sens_struct.h>
#include <driver/adc.h>

#include <Arduino.h>
#include <WiFi.h> //la lib Wifi de l'esp
#include <WiFiClientSecure.h>

#include "utils.h"
//************************************** Les variables pour le sampling (les interupts tout ça tout ça **************************************************************

#if BIT_DEPTH != 8 && BIT_DEPTH != 16
#error Bit depth non supporté
#endif

#define NB_IN_MOYENNE 500	
const int seuilRecord = 140;
int silence = 0;

#define TEMPS_RECORD 2500	
#define TEMPS_AVANT_SUIVANT 1000

#define TAILLE_BUFFER 25000 

#if BIT_DEPTH == 8
uint8_t bufferSample[TAILLE_BUFFER];
#else
uint16_t bufferSample[TAILLE_BUFFER];
#endif

//des variables volatiles car apparement c'est nécessaire quand on les appelle depuis un interupt
volatile int indexSample = 0;
volatile unsigned long int somme = 0;
volatile int compteurMoyenne = 0;
volatile int moyenne = 0;
volatile bool isRecording = false;
volatile bool canQuery = false;

hw_timer_t *timer = NULL; //handle du timer qui sample l'audio
portMUX_TYPE timerMux = portMUX_INITIALIZER_UNLOCKED;

TaskHandle_t handleTacheAudioSend = NULL;
//*************************************** variables wifi et internet *****************************************************************

const char *ssid = "ssid";
const char *password = "password";

const int rand_pin = 33;
unsigned long beginMicros, endMicros;
unsigned long byteCount = 0;
const bool printWebData = false; 
String intent = "";
String value = "";

WiFiClientSecure client;

void IRAM_ATTR onTimer() //l'interupt qui sample l'audio (appellé 50000 par secondes)
{
	portENTER_CRITICAL_ISR(&timerMux);
	uint16_t value = local_adc1_read(ADC1_CHANNEL_0);

	somme += abs(value - silence);
	compteurMoyenne++;
	if (compteurMoyenne == NB_IN_MOYENNE)
	{
		moyenne = somme / NB_IN_MOYENNE;
		somme = 0;
		compteurMoyenne = 0;
	}

	if (handleTacheAudioSend != NULL)
	{
		eTaskState state = eTaskGetState(handleTacheAudioSend);

		if (moyenne >= seuilRecord && !isRecording && canQuery && state != eRunning && state != eBlocked)///si le niveau sonore dépasse un certain seuil
		{
			BaseType_t xHigherPriorityTaskWoken = pdFALSE;
			vTaskNotifyGiveFromISR(handleTacheAudioSend, &xHigherPriorityTaskWoken);
			if (xHigherPriorityTaskWoken)
				portYIELD_FROM_ISR();
		}
	}

#if BIT_DEPTH == 8
	uint8_t valeur = map(value, 0, 4095, 0, 255);
#else
	uint16_t valeur = map(value, 0, 4095, 0, 65535);
#endif

	if (indexSample < TAILLE_BUFFER)
	{
		bufferSample[indexSample++] = valeur;//on ajoute la valeur mesurée au buffer
	}
	//Si le buffer est plein on doit l'envoyer par internet avant de l'écraser avec des nouvelles valeur
	//Mais cette fonction doit pouvoir s'éxécuter en 1/50000 de secondes donc pour pas la ralentir on appelle une tâche FreeRTOS qui enverra l'audio à wit.ai
	if (indexSample == TAILLE_BUFFER)
	{
		indexSample = 0;
		if (handleTacheAudioSend != NULL && isRecording)
		{
			if (eTaskGetState(handleTacheAudioSend) != eRunning && canQuery)
			{
				BaseType_t xHigherPriorityTaskWoken = pdFALSE;
				vTaskNotifyGiveFromISR(handleTacheAudioSend, &xHigherPriorityTaskWoken);
				if (xHigherPriorityTaskWoken)
					portYIELD_FROM_ISR();
			}
		}
	}

	portEXIT_CRITICAL_ISR(&timerMux);
}

//la tâche FreeRTOS qui envoie l'audio à wit.ai quand le buffer est plein
void audioRecord(void *parameter)
{
	int resetAt = 0;
	while (!client.connect(SERVER, PORT))
		Serial.print(".");

	vTaskDelay(pdMS_TO_TICKS(3000));
	canQuery = true;
	Serial.println("fini");
	while (true)
	{
		ulTaskNotifyTake(pdTRUE, portMAX_DELAY);

		if (isRecording == false) //si on record pas quand la tâche est appellé on doit commencer à record (commencer la requête HTTPS)
		{
			// if(moyenne < seuilRecord)
			// continue;
			Serial.println("Request started");
			//Serial.println(moyenne);
			resetAt = millis() + TEMPS_RECORD;
			startChunkedRequest(client);
			// Serial.println("Request started end");
			isRecording = true;
			continue; //on skip le code d'après
		}

		if (millis() >= resetAt) //si on record ET que le temps de record est dépassé on termine la requête HTTPS
		{
			// Serial.println("Request over start");
			resetAt = 0;
			endChunkedRequest(client);
			Serial.println("Request over");

			int nbOpenAc = 0;
			int nbClosedAc = 0;
			canQuery = false;
			String response = "";
			//la boucle pour récupérer la réponse du serveur
			while (client.connected())
			{
				int len = client.available();
				if (len > 0)
				{
					byte buffer[80];
					if (len > 80)
						len = 80;
					client.read(buffer, len);
					if (printWebData)
					{
						Serial.write(buffer, len); 
					}

					for (int i = 0; i < len; i++) //octet par octet on regarde la réponse
					{
						if ((char)buffer[i] == '{')
							nbOpenAc++;
						if ((char)buffer[i] == '}')
							nbClosedAc++;
						response += (char)buffer[i];
					}
					byteCount = byteCount + len;
					if (nbOpenAc == nbClosedAc && nbOpenAc != 0)
						break;
				}
			}

			//On regarde/analyse les données reçues (faut faire des tests pour voir si ça crash pas)
			const int iStartV = response.indexOf("value");
			int iStartN = -1;//INFO: on fait ça pour que le goto saute pas la déclaration de la variable
			Serial.println(response);
			if (iStartV == -1)
			{
				Serial.println("\"value\" pas trouvé");
				goto processing_over;
			}
			value = response.substring(iStartV + 9, response.indexOf("\"", iStartV + 9));

			iStartN = response.indexOf("name");
			if (iStartN == -1)
			{
				Serial.println("\"name\" pas trouvé (intent)");
				goto processing_over;
			}
			intent = response.substring(iStartN + 8, response.indexOf("\"", iStartN + 8));

		processing_over: //   /!\ goto
			isRecording = false;
			vTaskDelay(pdMS_TO_TICKS(TEMPS_AVANT_SUIVANT));
			canQuery = true;
			Serial.println("On peut recommencer");
			continue; //skip la suite du code
		}
		if (client.connected()) //enfin, si on record et que le temps n'est pas dépassé on envoie le buffer plein de samples à wit.ai
		{
			// fait des "paquets" de 16000 bits
			for (size_t i = 0; i < sizeof(bufferSample); i += 16000)
			{
				const size_t count = i + 16000 > sizeof(bufferSample) ? sizeof(bufferSample) - i : 16000;
				chunkedRequest(client, (uint8_t *)bufferSample + i, count);
			}
			//Serial.println("After buffer");
		}
	}
}

void setup()
{
	Serial.begin(115200);
  pinMode(26,OUTPUT);
	WiFi.begin(ssid, password);
	while (WiFi.status() != WL_CONNECTED)
	{
		delay(500);
		Serial.print(".");
	}

	Serial.print("On est connecté au wifi, avec l'ip : ");
	Serial.println(WiFi.localIP());

	//client.setCACert(ca_cert);

	adc1_config_width(ADC_WIDTH_12Bit);
	adc1_config_channel_atten(ADC1_CHANNEL_0, ADC_ATTEN_DB_6);
	adc1_get_raw(ADC1_CHANNEL_0);
	for (int i = 0; i < 500; i++)
		silence += adc1_get_raw(ADC1_CHANNEL_0);
	silence /= 500;

	timer = timerBegin(0, 80, true); //un timer pour l'interupt qui s'active à 1MHz
	timerAttachInterrupt(timer, &onTimer, true);
	timerAlarmWrite(timer, 20, true); //à chaque fois que le timer au dessus s'active on incrémente une variable et on active la tâche qui enregistre quand il atteint 20, on sample donc à 50KHz
	timerAlarmEnable(timer);
	xTaskCreatePinnedToCore(audioRecord, "audioRecord", 17236, NULL, tskIDLE_PRIORITY, &handleTacheAudioSend, 0); //on créé la tâche FreeeRTOS
}

bool ledState = false;
void loop()
{
	if(intent == "set_lumiere_state")
	{
		if(value == "on")
			ledState = true;
		else if(value == "off")
			ledState = false;
		else
			Serial.println("La string a du être mal parsée");
		
		value = "";
		intent = "";
	}
  digitalWrite(26,ledState); 
}
