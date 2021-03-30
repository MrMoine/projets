#include "utils.h"
#include <WiFiClientSecure.h>
#include <soc/sens_reg.h> //les lib bas niveau pour pouvoir recréer une version bas niveau + IRAM d'analogRead afin de pouvoir l'appeler depuis un interupt
#include <soc/sens_struct.h>
#include <driver/adc.h>
                       
int IRAM_ATTR local_adc1_read(int channel) //la version bas niveau et IRAM d'analogRead 
{
  uint16_t adc_value;
  SENS.sar_meas_start1.sar1_en_pad = (1 << channel); 
  while (SENS.sar_slave_addr1.meas_status != 0)
    ;
  SENS.sar_meas_start1.meas1_start_sar = 0;
  SENS.sar_meas_start1.meas1_start_sar = 1;
  while (SENS.sar_meas_start1.meas1_done_sar == 0)
    ;
  adc_value = SENS.sar_meas_start1.meas1_data_sar;
  return adc_value;
}

//pour commencer la requête HTTPS pour le streaming audio
void startChunkedRequest(WiFiClientSecure &client)
{
//  client.connect(SERVER, PORT);
  client.println("POST " ENDPOINT" HTTP/1.1");
  client.println("Host: "SERVER);
  client.println("Authorization: Bearer " TOKEN);
  client.println("Content-Type: audio/raw;encoding=signed-integer;bits=" xstr(BIT_DEPTH) ";rate=50000;endian=little");
  client.println("User-Agent: Mozilla/5.0");
  client.println("Transfer-Encoding: chunked");
  client.println();
}

//pour terminer la requête HTTPS pour le streaming audio
void endChunkedRequest(WiFiClientSecure &client)
{
  client.println("0");
  client.println();
}

//pour envoyer un chunk de données en HTTPS
void chunkedRequest(WiFiClientSecure &client, const uint8_t *buffer, size_t len)
{
  client.println(len, HEX);
  client.write((uint8_t*)buffer, len);
  client.println();
}
