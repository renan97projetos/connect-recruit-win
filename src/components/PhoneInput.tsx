import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  required?: boolean;
}

const COUNTRY_CODES = [
  { code: '55', label: 'Brasil +55', flag: '🇧🇷' },
  { code: '1', label: 'EUA/Canadá +1', flag: '🇺🇸' },
  { code: '351', label: 'Portugal +351', flag: '🇵🇹' },
  { code: '34', label: 'Espanha +34', flag: '🇪🇸' },
  { code: '54', label: 'Argentina +54', flag: '🇦🇷' },
];

const BR_AREA_CODES = [
  { code: '11', region: 'SP - São Paulo' },
  { code: '12', region: 'SP - São José dos Campos' },
  { code: '13', region: 'SP - Santos' },
  { code: '14', region: 'SP - Bauru' },
  { code: '15', region: 'SP - Sorocaba' },
  { code: '16', region: 'SP - Ribeirão Preto' },
  { code: '17', region: 'SP - São José do Rio Preto' },
  { code: '18', region: 'SP - Presidente Prudente' },
  { code: '19', region: 'SP - Campinas' },
  { code: '21', region: 'RJ - Rio de Janeiro' },
  { code: '22', region: 'RJ - Campos dos Goytacazes' },
  { code: '24', region: 'RJ - Volta Redonda' },
  { code: '27', region: 'ES - Vitória' },
  { code: '28', region: 'ES - Cachoeiro de Itapemirim' },
  { code: '31', region: 'MG - Belo Horizonte' },
  { code: '32', region: 'MG - Juiz de Fora' },
  { code: '33', region: 'MG - Governador Valadares' },
  { code: '34', region: 'MG - Uberlândia' },
  { code: '35', region: 'MG - Poços de Caldas' },
  { code: '37', region: 'MG - Divinópolis' },
  { code: '38', region: 'MG - Montes Claros' },
  { code: '41', region: 'PR - Curitiba' },
  { code: '42', region: 'PR - Ponta Grossa' },
  { code: '43', region: 'PR - Londrina' },
  { code: '44', region: 'PR - Maringá' },
  { code: '45', region: 'PR - Foz do Iguaçu' },
  { code: '46', region: 'PR - Francisco Beltrão' },
  { code: '47', region: 'SC - Joinville' },
  { code: '48', region: 'SC - Florianópolis' },
  { code: '49', region: 'SC - Chapecó' },
  { code: '51', region: 'RS - Porto Alegre' },
  { code: '53', region: 'RS - Pelotas' },
  { code: '54', region: 'RS - Caxias do Sul' },
  { code: '55', region: 'RS - Santa Maria' },
  { code: '61', region: 'DF - Brasília' },
  { code: '62', region: 'GO - Goiânia' },
  { code: '63', region: 'TO - Palmas' },
  { code: '64', region: 'GO - Rio Verde' },
  { code: '65', region: 'MT - Cuiabá' },
  { code: '66', region: 'MT - Rondonópolis' },
  { code: '67', region: 'MS - Campo Grande' },
  { code: '68', region: 'AC - Rio Branco' },
  { code: '69', region: 'RO - Porto Velho' },
  { code: '71', region: 'BA - Salvador' },
  { code: '73', region: 'BA - Ilhéus' },
  { code: '74', region: 'BA - Juazeiro' },
  { code: '75', region: 'BA - Feira de Santana' },
  { code: '77', region: 'BA - Barreiras' },
  { code: '79', region: 'SE - Aracaju' },
  { code: '81', region: 'PE - Recife' },
  { code: '82', region: 'AL - Maceió' },
  { code: '83', region: 'PB - João Pessoa' },
  { code: '84', region: 'RN - Natal' },
  { code: '85', region: 'CE - Fortaleza' },
  { code: '86', region: 'PI - Teresina' },
  { code: '87', region: 'PE - Petrolina' },
  { code: '88', region: 'CE - Juazeiro do Norte' },
  { code: '89', region: 'PI - Picos' },
  { code: '91', region: 'PA - Belém' },
  { code: '92', region: 'AM - Manaus' },
  { code: '93', region: 'PA - Santarém' },
  { code: '94', region: 'PA - Marabá' },
  { code: '95', region: 'RR - Boa Vista' },
  { code: '96', region: 'AP - Macapá' },
  { code: '97', region: 'AM - Tefé' },
  { code: '98', region: 'MA - São Luís' },
  { code: '99', region: 'MA - Imperatriz' },
];

export function PhoneInput({ value, onChange, label = 'Telefone', required = false }: PhoneInputProps) {
  // Parse existing value
  const parsePhone = (phone: string) => {
    if (!phone) return { countryCode: '55', areaCode: '', number: '' };
    
    const cleaned = phone.replace(/\D/g, '');
    
    // Try to identify country code
    let countryCode = '55';
    let rest = cleaned;
    
    if (cleaned.startsWith('55') && cleaned.length >= 12) {
      countryCode = '55';
      rest = cleaned.substring(2);
    } else if (cleaned.startsWith('1') && cleaned.length === 11) {
      countryCode = '1';
      rest = cleaned.substring(1);
    } else if (cleaned.startsWith('351') && cleaned.length >= 12) {
      countryCode = '351';
      rest = cleaned.substring(3);
    } else if (cleaned.startsWith('34') && cleaned.length >= 11) {
      countryCode = '34';
      rest = cleaned.substring(2);
    } else if (cleaned.startsWith('54') && cleaned.length >= 12) {
      countryCode = '54';
      rest = cleaned.substring(2);
    }
    
    // Extract area code (for Brazil)
    let areaCode = '';
    let number = rest;
    if (countryCode === '55' && rest.length >= 10) {
      areaCode = rest.substring(0, 2);
      number = rest.substring(2);
    }
    
    return { countryCode, areaCode, number };
  };

  const { countryCode, areaCode, number } = parsePhone(value);

  const updatePhone = (newCountryCode?: string, newAreaCode?: string, newNumber?: string) => {
    const cc = newCountryCode ?? countryCode;
    const ac = newAreaCode ?? areaCode;
    const num = newNumber ?? number;
    
    // Build complete phone number
    let fullPhone = cc;
    if (cc === '55' && ac) {
      fullPhone += ac;
    }
    fullPhone += num;
    
    onChange(fullPhone);
  };

  return (
    <div className="space-y-2">
      {label && (
        <Label>
          {label} {required && <span className="text-destructive">*</span>}
        </Label>
      )}
      <div className="grid grid-cols-12 gap-2">
        {/* Country Code */}
        <div className="col-span-4">
          <Select value={countryCode} onValueChange={(val) => updatePhone(val, '', '')}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COUNTRY_CODES.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {c.flag} +{c.code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Area Code (Brazil only) */}
        {countryCode === '55' && (
          <div className="col-span-3">
            <Select value={areaCode} onValueChange={(val) => updatePhone(undefined, val, undefined)}>
              <SelectTrigger>
                <SelectValue placeholder="DDD" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {BR_AREA_CODES.map((area) => (
                  <SelectItem key={area.code} value={area.code}>
                    {area.code} - {area.region}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Phone Number */}
        <div className={countryCode === '55' ? 'col-span-5' : 'col-span-8'}>
          <Input
            type="tel"
            placeholder={countryCode === '55' ? '98765-4321' : 'Número'}
            value={number}
            onChange={(e) => {
              const cleaned = e.target.value.replace(/\D/g, '');
              updatePhone(undefined, undefined, cleaned);
            }}
            maxLength={countryCode === '55' ? 9 : 15}
          />
        </div>
      </div>
    </div>
  );
}
