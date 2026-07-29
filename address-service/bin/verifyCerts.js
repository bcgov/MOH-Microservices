//run from inside OpenShift to verify certificates

const https = require("https");
const soap = require("easy-soap-request");

//certificates are stored in base64 in OpenShift
//so they need to be decoded before we can use them
function base64Decode(string) {
  if (!string) return "empty";
  let buffer = new Buffer.from(string, "base64");
  return buffer.toString("ascii");
}

const clientCert = base64Decode(process.env.MUTUAL_TLS_PEM_CERT);
const clientKey = base64Decode(process.env.MUTUAL_TLS_PEM_KEY_BASE64);

const url = process.env.ADDRESS_VALIDATOR_URL;
const address = "111%20Fake"; //or any other address you like

const xml = `<soapenv:Envelope 
        xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
        xmlns:v4="http://validator5.AddressDoctor.com/Webservice5/v4">
   <soapenv:Header/>
   <soapenv:Body>
      <v4:Process>
         <v4:parameters>
            <v4:ProcessMode>FASTCOMPLETION</v4:ProcessMode>
         </v4:parameters>
         <v4:addresses>
            <v4:Address>
               <v4:Country>
                  <v4:string>Canada</v4:string>
               </v4:Country>
               <v4:AddressComplete>${address}</v4:AddressComplete>
            </v4:Address>
         </v4:addresses>
      </v4:Process>
   </soapenv:Body>
</soapenv:Envelope>`;

const agent = new https.Agent({
  rejectUnauthorized: false,
  cert: clientCert,
  key: clientKey,
});

const soapOpts = {
  url: url,
  headers: {
    "user-agent": "node.js",
    "Content-Type": "text/xml;charset=UTF-8",
  },
  xml: xml,
  timeout: 5000,
  extraOpts: {
    httpsAgent: agent,
  },
  checkServerIdentity: () => {
    return null;
  },
};

soap(soapOpts)
  .then((data) => {
    console.log("response: ", data.response);
  })
  .catch((err) => {
    const error = { error: err.message || err };
    console.log(error);
  });
