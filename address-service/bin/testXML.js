export const testXML = `<?xml version='1.0' encoding='UTF-8'?>
<S:Envelope xmlns:S="http://schemas.xmlsoap.org/soap/envelope/"
    xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/">
    <SOAP-ENV:Header />
    <S:Body xmlns="http://xml-namespace.fake">
        <ProcessResponse xmlns="http://xml-namespace.fake">
            <ProcessResult>
                <StatusCode>100</StatusCode>
                <StatusMessage>OK</StatusMessage>
                <Results>
                    <Result>
                        <ProcessStatus>Q3</ProcessStatus>
                        <CountryISO3>CAN</CountryISO3>
                        <ResultDataSet>
                            <ResultData>
                                <ResultNumber>0</ResultNumber>
                                <MailabilityScore>0</MailabilityScore>
                                <ResultPercentage>0</ResultPercentage>
                                <ElementInputStatus>0</ElementInputStatus>
                                <ElementResultStatus>0</ElementResultStatus>
                                <ElementRelevance>0</ElementRelevance>
                                <ExtElementStatus>0</ExtElementStatus>
                                <AddressResolutionCode>0</AddressResolutionCode>
                                <AddressType>A</AddressType>
                                <LanguageISO3>ENG</LanguageISO3>
                                <Address>
                                    <Organization />
                                    <Contact />
                                    <Building />
                                    <SubBuilding />
                                    <Street>
                                        <string>FAKE ST</string>
                                    </Street>
                                    <HouseNumber>
                                        <string>111</string>
                                    </HouseNumber>
                                    <DeliveryService />
                                    <Locality>
                                        <string>FAKEVILLE</string>
                                    </Locality>
                                    <PostalCode>
                                        <string>V1A 1A1</string>
                                    </PostalCode>
                                    <Province>
                                        <string>BC</string>
                                    </Province>
                                    <Country>
                                        <string>CANADA</string>
                                    </Country>
                                    <Residue />
                                    <RecipientLines />
                                    <DeliveryAddressLines>
                                        <string>111 FAKE ST</string>
                                    </DeliveryAddressLines>
                                    <CountrySpecificLocalityLine>
                                        <string>FAKEVILLE BC V1A 1A1</string>
                                    </CountrySpecificLocalityLine>
                                    <FormattedAddress>
                                        <string>111 FAKE ST</string>
                                        <string>FAKEVILLE BC V1A 1A1</string>
                                    </FormattedAddress>
                                    <AddressComplete>111 FAKE ST\nFAKEVILLE BC V1A 1A1</AddressComplete>
                                </Address>
                            </ResultData>
                            <ResultData>
                                <ResultNumber>0</ResultNumber>
                                <MailabilityScore>0</MailabilityScore>
                                <ResultPercentage>0</ResultPercentage>
                                <ElementInputStatus>0</ElementInputStatus>
                                <ElementResultStatus>0</ElementResultStatus>
                                <ElementRelevance>0</ElementRelevance>
                                <ExtElementStatus>0</ExtElementStatus>
                                <AddressResolutionCode>0</AddressResolutionCode>
                                <AddressType>A</AddressType>
                                <LanguageISO3>ENG</LanguageISO3>
                                <Address>
                                    <Organization />
                                    <Contact />
                                    <Building />
                                    <SubBuilding />
                                    <Street>
                                        <string>FAKE ST</string>
                                    </Street>
                                    <HouseNumber>
                                        <string>222</string>
                                    </HouseNumber>
                                    <DeliveryService />
                                    <Locality>
                                        <string>FAKEVILLE</string>
                                    </Locality>
                                    <PostalCode>
                                        <string>V1A 1A1</string>
                                    </PostalCode>
                                    <Province>
                                        <string>BC</string>
                                    </Province>
                                    <Country>
                                        <string>CANADA</string>
                                    </Country>
                                    <Residue />
                                    <RecipientLines />
                                    <DeliveryAddressLines>
                                        <string>222 FAKE ST</string>
                                    </DeliveryAddressLines>
                                    <CountrySpecificLocalityLine>
                                        <string>FAKEVILLE BC V1A 1A1</string>
                                    </CountrySpecificLocalityLine>
                                    <FormattedAddress>
                                        <string>222 FAKE ST</string>
                                        <string>FAKEVILLE BC V1A 1A1</string>
                                    </FormattedAddress>
                                    <AddressComplete>222 FAKE ST\nFAKEVILLE BC V1A 1A1</AddressComplete>
                                </Address>
                            </ResultData>
                            <ResultData>
                                <ResultNumber>0</ResultNumber>
                                <MailabilityScore>0</MailabilityScore>
                                <ResultPercentage>0</ResultPercentage>
                                <ElementInputStatus>0</ElementInputStatus>
                                <ElementResultStatus>0</ElementResultStatus>
                                <ElementRelevance>0</ElementRelevance>
                                <ExtElementStatus>0</ExtElementStatus>
                                <AddressResolutionCode>0</AddressResolutionCode>
                                <AddressType>A</AddressType>
                                <LanguageISO3>ENG</LanguageISO3>
                                <Address>
                                    <Organization />
                                    <Contact />
                                    <Building />
                                    <SubBuilding />
                                    <Street>
                                        <string>FAKE ST</string>
                                    </Street>
                                    <HouseNumber>
                                        <string>333</string>
                                    </HouseNumber>
                                    <DeliveryService />
                                    <Locality>
                                        <string>FAKEVILLE</string>
                                    </Locality>
                                    <PostalCode>
                                        <string>V1A 1A1</string>
                                    </PostalCode>
                                    <Province>
                                        <string>BC</string>
                                    </Province>
                                    <Country>
                                        <string>CANADA</string>
                                    </Country>
                                    <Residue />
                                    <RecipientLines />
                                    <DeliveryAddressLines>
                                        <string>333 FAKE ST</string>
                                    </DeliveryAddressLines>
                                    <CountrySpecificLocalityLine>
                                        <string>FAKEVILLE BC V1A 1A1</string>
                                    </CountrySpecificLocalityLine>
                                    <FormattedAddress>
                                        <string>333 FAKE ST</string>
                                        <string>FAKEVILLE BC V1A 1A1</string>
                                    </FormattedAddress>
                                    <AddressComplete>333 FAKE ST\nFAKEVILLE BC V1A 1A1</AddressComplete>
                                </Address>
                            </ResultData>
                        </ResultDataSet>
                    </Result>
                </Results>
            </ProcessResult>
        </ProcessResponse>
    </S:Body>
</S:Envelope>`;
