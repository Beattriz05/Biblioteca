import { Request } from 'express';
import { ValidationError } from '../errors/ValidationError';

/**
 * Tipos de validação disponíveis
 */
export type ValidationType = 
  | 'string' 
  | 'number' 
  | 'boolean' 
  | 'email' 
  | 'url' 
  | 'date' 
  | 'cpf' 
  | 'cnpj' 
  | 'cep' 
  | 'phone' 
  | 'isbn' 
  | 'uuid' 
  | 'json' 
  | 'base64' 
  | 'password';

/**
 * Interface para regras de validação
 */
export interface ValidationRule {
  type: ValidationType;
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean;
  message?: string;
  transform?: (value: any) => any;
  enum?: any[];
}

/**
 * Interface para resultado de validação
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationErrorItem[];
  sanitizedData: any;
}

export interface ValidationErrorItem {
  field: string;
  message: string;
  value?: any;
  code?: string;
}

/**
 * Classe principal de validação
 */
export class Validator {
  private data: any;
  private errors: ValidationErrorItem[] = [];
  private sanitizedData: any = {};

  constructor(data: any) {
    this.data = data;
    this.sanitizedData = { ...data };
  }

  /**
   * Valida um campo específico
   */
  validateField(field: string, rules: ValidationRule | ValidationRule[]): this {
    const value = this.data[field];
    const ruleList = Array.isArray(rules) ? rules : [rules];

    for (const rule of ruleList) {
      const error = this.checkRule(field, value, rule);
      if (error) {
        this.errors.push(error);
        break; // Para na primeira regra que falhar
      }
    }

    return this;
  }

  /**
   * Valida múltiplos campos
   */
  validateFields(fields: Record<string, ValidationRule | ValidationRule[]>): this {
    Object.entries(fields).forEach(([field, rules]) => {
      this.validateField(field, rules);
    });
    return this;
  }

  /**
   * Executa validação customizada
   */
  custom(validator: (data: any) => ValidationErrorItem | null): this {
    const error = validator(this.data);
    if (error) {
      this.errors.push(error);
    }
    return this;
  }

  /**
   * Verifica se a validação passou
   */
  getResult(): ValidationResult {
    return {
      isValid: this.errors.length === 0,
      errors: this.errors,
      sanitizedData: this.sanitizedData
    };
  }

  /**
   * Lança erro se a validação falhar
   */
  throwIfInvalid(message: string = 'Erro de validação'): void {
    const result = this.getResult();
    if (!result.isValid) {
      throw new ValidationError(message, result.errors);
    }
  }

  /**
   * Valida uma regra específica
   */
  private checkRule(field: string, value: any, rule: ValidationRule): ValidationErrorItem | null {
    // Verifica se é obrigatório
    if (rule.required && (value === undefined || value === null || value === '')) {
      return {
        field,
        message: rule.message || `${field} é obrigatório`,
        value,
        code: 'REQUIRED'
      };
    }

    // Se não é obrigatório e está vazio, retorna null (validação passa)
    if (!rule.required && (value === undefined || value === null || value === '')) {
      return null;
    }

    // Aplica transformação se especificado
    let transformedValue = value;
    if (rule.transform) {
      transformedValue = rule.transform(value);
      this.sanitizedData[field] = transformedValue;
    }

    // Validação baseada no tipo
    let isValid = true;
    let errorMessage = rule.message || `Validação falhou para ${field}`;
    let errorCode = 'VALIDATION_FAILED';

    switch (rule.type) {
      case 'string':
        isValid = this.validateString(transformedValue, rule);
        errorMessage = rule.message || `${field} deve ser uma string válida`;
        break;

      case 'number':
        isValid = this.validateNumber(transformedValue, rule);
        errorMessage = rule.message || `${field} deve ser um número válido`;
        break;

      case 'boolean':
        isValid = this.validateBoolean(transformedValue);
        errorMessage = rule.message || `${field} deve ser verdadeiro ou falso`;
        break;

      case 'email':
        isValid = this.validateEmail(transformedValue);
        errorMessage = rule.message || `${field} deve ser um email válido`;
        errorCode = 'INVALID_EMAIL';
        break;

      case 'url':
        isValid = this.validateUrl(transformedValue);
        errorMessage = rule.message || `${field} deve ser uma URL válida`;
        errorCode = 'INVALID_URL';
        break;

      case 'date':
        isValid = this.validateDate(transformedValue);
        errorMessage = rule.message || `${field} deve ser uma data válida`;
        errorCode = 'INVALID_DATE';
        break;

      case 'cpf':
        isValid = this.validateCPF(transformedValue);
        errorMessage = rule.message || `${field} deve ser um CPF válido`;
        errorCode = 'INVALID_CPF';
        break;

      case 'cnpj':
        isValid = this.validateCNPJ(transformedValue);
        errorMessage = rule.message || `${field} deve ser um CNPJ válido`;
        errorCode = 'INVALID_CNPJ';
        break;

      case 'cep':
        isValid = this.validateCEP(transformedValue);
        errorMessage = rule.message || `${field} deve ser um CEP válido`;
        errorCode = 'INVALID_CEP';
        break;

      case 'phone':
        isValid = this.validatePhone(transformedValue);
        errorMessage = rule.message || `${field} deve ser um telefone válido`;
        errorCode = 'INVALID_PHONE';
        break;

      case 'isbn':
        isValid = this.validateISBN(transformedValue);
        errorMessage = rule.message || `${field} deve ser um ISBN válido`;
        errorCode = 'INVALID_ISBN';
        break;

      case 'uuid':
        isValid = this.validateUUID(transformedValue);
        errorMessage = rule.message || `${field} deve ser um UUID válido`;
        errorCode = 'INVALID_UUID';
        break;

      case 'json':
        isValid = this.validateJSON(transformedValue);
        errorMessage = rule.message || `${field} deve ser um JSON válido`;
        errorCode = 'INVALID_JSON';
        break;

      case 'base64':
        isValid = this.validateBase64(transformedValue);
        errorMessage = rule.message || `${field} deve ser uma string base64 válida`;
        errorCode = 'INVALID_BASE64';
        break;

      case 'password':
        isValid = this.validatePassword(transformedValue, rule);
        errorMessage = rule.message || `${field} deve ser uma senha forte`;
        errorCode = 'WEAK_PASSWORD';
        break;
    }

    // Validação customizada
    if (rule.custom && !rule.custom(transformedValue)) {
      isValid = false;
      errorMessage = rule.message || `${field} não passou na validação customizada`;
      errorCode = 'CUSTOM_VALIDATION_FAILED';
    }

    // Validação de enum
    if (rule.enum && !rule.enum.includes(transformedValue)) {
      isValid = false;
      errorMessage = rule.message || `${field} deve ser um dos valores: ${rule.enum.join(', ')}`;
      errorCode = 'INVALID_ENUM_VALUE';
    }

    // Validação de padrão regex
    if (rule.pattern && !rule.pattern.test(String(transformedValue))) {
      isValid = false;
      errorMessage = rule.message || `${field} não corresponde ao padrão esperado`;
      errorCode = 'PATTERN_MISMATCH';
    }

    if (!isValid) {
      return {
        field,
        message: errorMessage,
        value: transformedValue,
        code: errorCode
      };
    }

    return null;
  }

  /**
   * Validações específicas por tipo
   */
  private validateString(value: any, rule: ValidationRule): boolean {
    if (typeof value !== 'string') return false;
    
    const str = value.trim();
    
    if (rule.min !== undefined && str.length < rule.min) return false;
    if (rule.max !== undefined && str.length > rule.max) return false;
    
    return true;
  }

  private validateNumber(value: any, rule: ValidationRule): boolean {
    const num = Number(value);
    if (isNaN(num)) return false;
    
    if (rule.min !== undefined && num < rule.min) return false;
    if (rule.max !== undefined && num > rule.max) return false;
    
    return true;
  }

  private validateBoolean(value: any): boolean {
    return typeof value === 'boolean' || 
           value === 'true' || 
           value === 'false' || 
           value === '1' || 
           value === '0' ||
           value === 1 ||
           value === 0;
  }

  private validateEmail(value: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(String(value).toLowerCase());
  }

  private validateUrl(value: string): boolean {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  }

  private validateDate(value: any): boolean {
    const date = new Date(value);
    return !isNaN(date.getTime());
  }

  private validateCPF(value: string): boolean {
    const cpf = value.replace(/\D/g, '');
    
    if (cpf.length !== 11) return false;
    if (/^(\d)\1+$/.test(cpf)) return false;
    
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cpf.charAt(i)) * (10 - i);
    }
    
    let remainder = sum % 11;
    const digit1 = remainder < 2 ? 0 : 11 - remainder;
    
    if (parseInt(cpf.charAt(9)) !== digit1) return false;
    
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cpf.charAt(i)) * (11 - i);
    }
    
    remainder = sum % 11;
    const digit2 = remainder < 2 ? 0 : 11 - remainder;
    
    return parseInt(cpf.charAt(10)) === digit2;
  }

  private validateCNPJ(value: string): boolean {
    const cnpj = value.replace(/\D/g, '');
    
    if (cnpj.length !== 14) return false;
    if (/^(\d)\1+$/.test(cnpj)) return false;
    
    const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(cnpj.charAt(i)) * weights1[i];
    }
    
    let remainder = sum % 11;
    const digit1 = remainder < 2 ? 0 : 11 - remainder;
    
    if (parseInt(cnpj.charAt(12)) !== digit1) return false;
    
    sum = 0;
    for (let i = 0; i < 13; i++) {
      sum += parseInt(cnpj.charAt(i)) * weights2[i];
    }
    
    remainder = sum % 11;
    const digit2 = remainder < 2 ? 0 : 11 - remainder;
    
    return parseInt(cnpj.charAt(13)) === digit2;
  }

  private validateCEP(value: string): boolean {
    const cep = value.replace(/\D/g, '');
    return cep.length === 8;
  }

  private validatePhone(value: string): boolean {
    const phone = value.replace(/\D/g, '');
    return phone.length >= 10 && phone.length <= 11;
  }

  private validateISBN(value: string): boolean {
    const isbn = value.replace(/[-\s]/g, '');
    
    // ISBN-10
    if (isbn.length === 10) {
      return this.validateISBN10(isbn);
    }
    
    // ISBN-13
    if (isbn.length === 13) {
      return this.validateISBN13(isbn);
    }
    
    return false;
  }

  private validateISBN10(isbn: string): boolean {
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      const digit = parseInt(isbn[i]);
      if (isNaN(digit)) return false;
      sum += digit * (10 - i);
    }
    
    const lastChar = isbn[9].toUpperCase();
    const lastDigit = lastChar === 'X' ? 10 : parseInt(lastChar);
    if (isNaN(lastDigit)) return false;
    
    sum += lastDigit;
    return sum % 11 === 0;
  }

  private validateISBN13(isbn: string): boolean {
    let sum = 0;
    for (let i = 0; i < 13; i++) {
      const digit = parseInt(isbn[i]);
      if (isNaN(digit)) return false;
      sum += digit * (i % 2 === 0 ? 1 : 3);
    }
    return sum % 10 === 0;
  }

  private validateUUID(value: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
  }

  private validateJSON(value: any): boolean {
    if (typeof value === 'object') return true;
    
    try {
      JSON.parse(value);
      return true;
    } catch {
      return false;
    }
  }

  private validateBase64(value: string): boolean {
    if (typeof value !== 'string') return false;
    
    try {
      return btoa(atob(value)) === value;
    } catch {
      return false;
    }
  }

  private validatePassword(value: string, rule: ValidationRule): boolean {
    if (typeof value !== 'string') return false;
    
    const minLength = rule.min || 8;
    if (value.length < minLength) return false;
    
    // Pelo menos uma letra maiúscula
    if (!/[A-Z]/.test(value)) return false;
    
    // Pelo menos uma letra minúscula
    if (!/[a-z]/.test(value)) return false;
    
    // Pelo menos um número
    if (!/\d/.test(value)) return false;
    
    // Pelo menos um caractere especial
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(value)) return false;
    
    return true;
  }
}

/**
 * Funções utilitárias de validação
 */
export const ValidationUtils = {
  /**
   * Validação rápida de um único valor
   */
  validate(value: any, type: ValidationType, options?: Partial<ValidationRule>): boolean {
    const validator = new Validator({ value });
    validator.validateField('value', { type, ...options });
    return validator.getResult().isValid;
  },

  /**
   * Validação de objeto completo
   */
  validateObject(obj: any, schema: Record<string, ValidationRule | ValidationRule[]>): ValidationResult {
    const validator = new Validator(obj);
    validator.validateFields(schema);
    return validator.getResult();
  },

  /**
   * Sanitiza strings (remove HTML, espaços, etc)
   */
  sanitizeString(input: string): string {
    return input
      .trim()
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/\s+/g, ' ') // Remove múltiplos espaços
      .replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/g, ''); // Remove caracteres especiais perigosos
  },

  /**
   * Sanitiza número
   */
  sanitizeNumber(input: any): number | null {
    const num = Number(input);
    return isNaN(num) ? null : num;
  },

  /**
   * Sanitiza email
   */
  sanitizeEmail(email: string): string {
    return email.toLowerCase().trim();
  },

  /**
   * Sanitiza URL
   */
  sanitizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.toString();
    } catch {
      return '';
    }
  },

  /**
   * Sanitiza data
   */
  sanitizeDate(date: any): Date | null {
    const d = new Date(date);
    return isNaN(d.getTime()) ? null : d;
  },

  /**
   * Sanitiza CPF
   */
  sanitizeCPF(cpf: string): string {
    return cpf.replace(/\D/g, '');
  },

  /**
   * Sanitiza CNPJ
   */
  sanitizeCNPJ(cnpj: string): string {
    return cnpj.replace(/\D/g, '');
  },

  /**
   * Sanitiza CEP
   */
  sanitizeCEP(cep: string): string {
    return cep.replace(/\D/g, '');
  },

  /**
   * Sanitiza telefone
   */
  sanitizePhone(phone: string): string {
    return phone.replace(/\D/g, '');
  },

  /**
   * Sanitiza ISBN
   */
  sanitizeISBN(isbn: string): string {
    return isbn.replace(/[-\s]/g, '');
  },

  /**
   * Valida e formata ISBN
   */
  formatISBN(isbn: string): string {
    const cleanISBN = isbn.replace(/[-\s]/g, '');
    
    if (cleanISBN.length === 10) {
      return `${cleanISBN.substring(0, 1)}-${cleanISBN.substring(1, 4)}-${cleanISBN.substring(4, 9)}-${cleanISBN.substring(9)}`;
    } else if (cleanISBN.length === 13) {
      return `${cleanISBN.substring(0, 3)}-${cleanISBN.substring(3, 4)}-${cleanISBN.substring(4, 6)}-${cleanISBN.substring(6, 12)}-${cleanISBN.substring(12)}`;
    }
    
    return isbn;
  },

  /**
   * Valida se o usuário é adulto
   */
  isAdult(birthDate: Date | string, minAge: number = 18): boolean {
    const birth = new Date(birthDate);
    const today = new Date();
    
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age >= minAge;
  },

  /**
   * Valida se a data está no futuro
   */
  isFutureDate(date: Date | string): boolean {
    return new Date(date) > new Date();
  },

  /**
   * Valida se a data está no passado
   */
  isPastDate(date: Date | string): boolean {
    return new Date(date) < new Date();
  },

  /**
   * Valida se uma string contém apenas letras
   */
  isAlpha(text: string): boolean {
    return /^[A-Za-zÀ-ÿ\s]+$/.test(text);
  },

  /**
   * Valida se uma string contém apenas números
   */
  isNumeric(text: string): boolean {
    return /^\d+$/.test(text);
  },

  /**
   * Valida se uma string contém apenas alfanuméricos
   */
  isAlphaNumeric(text: string): boolean {
    return /^[A-Za-zÀ-ÿ0-9\s]+$/.test(text);
  },

  /**
   * Valida tamanho de arquivo
   */
  validateFileSize(fileSize: number, maxSizeMB: number): boolean {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    return fileSize <= maxSizeBytes;
  },

  /**
   * Valida extensão de arquivo
   */
  validateFileExtension(filename: string, allowedExtensions: string[]): boolean {
    const extension = filename.split('.').pop()?.toLowerCase() || '';
    return allowedExtensions.includes(extension);
  },

  /**
   * Valida cor hexadecimal
   */
  isHexColor(color: string): boolean {
    return /^#([0-9A-F]{3}){1,2}$/i.test(color);
  },

  /**
   * Valida se é um objeto vazio
   */
  isEmptyObject(obj: any): boolean {
    return Object.keys(obj).length === 0 && obj.constructor === Object;
  },

  /**
   * Valida se é um array vazio
   */
  isEmptyArray(arr: any[]): boolean {
    return Array.isArray(arr) && arr.length === 0;
  },

  /**
   * Valida se é um valor vazio
   */
  isEmpty(value: any): boolean {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string' && value.trim() === '') return true;
    if (Array.isArray(value) && value.length === 0) return true;
    if (typeof value === 'object' && Object.keys(value).length === 0) return true;
    return false;
  }
};

/**
 * Schemas de validação predefinidos
 */
export const ValidationSchemas = {
  livro: {
    titulo: {
      type: 'string' as const,
      required: true,
      min: 2,
      max: 200,
      pattern: /^[a-zA-ZÀ-ÿ0-9\s\-_,.:;!?'"()]+$/,
      message: 'Título deve ter entre 2 e 200 caracteres e conter apenas letras, números e pontuação básica'
    },
    
    autor: {
      type: 'string' as const,
      required: true,
      min: 3,
      max: 100,
      pattern: /^[a-zA-ZÀ-ÿ\s.]+$/,
      message: 'Autor deve ter entre 3 e 100 caracteres e conter apenas letras e pontos'
    },
    
    isbn: {
      type: 'isbn' as const,
      required: true,
      message: 'ISBN inválido. Use ISBN-10 (ex: 85-359-0277-5) ou ISBN-13 (ex: 978-85-359-0277-3)'
    },
    
    anoPublicacao: {
      type: 'number' as const,
      required: true,
      min: 0,
      max: new Date().getFullYear(),
      message: `Ano de publicação deve estar entre 0 e ${new Date().getFullYear()}`
    },
    
    disponivel: {
      type: 'boolean' as const,
      required: false,
      default: true
    }
  },

  usuario: {
    nome: {
      type: 'string' as const,
      required: true,
      min: 3,
      max: 100,
      pattern: /^[a-zA-ZÀ-ÿ\s]+$/,
      message: 'Nome deve ter entre 3 e 100 caracteres e conter apenas letras'
    },
    
    email: {
      type: 'email' as const,
      required: true,
      message: 'Email inválido'
    },
    
    senha: {
      type: 'password' as const,
      required: true,
      min: 8,
      max: 100,
      message: 'Senha deve ter pelo menos 8 caracteres, incluindo maiúsculas, minúsculas, números e caracteres especiais'
    },
    
    telefone: {
      type: 'phone' as const,
      required: false,
      message: 'Telefone inválido. Use o formato (00) 00000-0000'
    }
  },

  endereco: {
    cep: {
      type: 'cep' as const,
      required: true,
      message: 'CEP inválido. Use o formato 00000-000'
    },
    
    logradouro: {
      type: 'string' as const,
      required: true,
      min: 3,
      max: 200
    },
    
    numero: {
      type: 'string' as const,
      required: true,
      pattern: /^[0-9]+[a-zA-Z]?$/,
      message: 'Número deve começar com dígitos e pode conter uma letra no final'
    },
    
    cidade: {
      type: 'string' as const,
      required: true,
      min: 2,
      max: 100
    },
    
    estado: {
      type: 'string' as const,
      required: true,
      pattern: /^[A-Z]{2}$/,
      message: 'Estado deve ser uma sigla de 2 letras maiúsculas'
    }
  },

  paginacao: {
    pagina: {
      type: 'number' as const,
      required: false,
      min: 1,
      default: 1,
      transform: (value: any) => parseInt(value) || 1
    },
    
    limite: {
      type: 'number' as const,
      required: false,
      min: 1,
      max: 100,
      default: 10,
      transform: (value: any) => parseInt(value) || 10
    },
    
    ordenarPor: {
      type: 'string' as const,
      required: false,
      enum: ['titulo', 'autor', 'anoPublicacao', 'dataCriacao']
    },
    
    ordem: {
      type: 'string' as const,
      required: false,
      enum: ['ASC', 'DESC', 'asc', 'desc'],
      transform: (value: any) => value?.toUpperCase()
    }
  }
};

/**
 * Middleware de validação para Express
 */
export const validationMiddleware = (schema: Record<string, ValidationRule | ValidationRule[]>) => {
  return (req: Request, res: any, next: any) => {
    const data = { ...req.body, ...req.query, ...req.params };
    const validator = new Validator(data);
    
    validator.validateFields(schema);
    const result = validator.getResult();
    
    if (!result.isValid) {
      const error = new ValidationError('Erro de validação', result.errors);
      return next(error);
    }
    
    // Adiciona dados sanitizados ao request
    req.validatedData = result.sanitizedData;
    next();
  };
};

/**
 * Decorator para validação de métodos de classe
 */
export function Validate(schema: Record<string, ValidationRule | ValidationRule[]>) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = function (...args: any[]) {
      // Assume que o primeiro argumento é o objeto a ser validado
      const data = args[0];
      const validator = new Validator(data);
      
      validator.validateFields(schema);
      const result = validator.getResult();
      
      if (!result.isValid) {
        throw new ValidationError(`Erro de validação em ${propertyKey}`, result.errors);
      }
      
      // Substitui o argumento pelos dados sanitizados
      args[0] = result.sanitizedData;
      
      return originalMethod.apply(this, args);
    };
    
    return descriptor;
  };
}

/**
 * Funções de validação específicas para livros
 */
export const LivroValidators = {
  /**
   * Valida dados completos de um livro
   */
  validateLivro(livroData: any): ValidationResult {
    return ValidationUtils.validateObject(livroData, ValidationSchemas.livro);
  },

  /**
   * Valida ISBN de forma rigorosa
   */
  validateISBN(isbn: string): boolean {
    return ValidationUtils.validate(isbn, 'isbn');
  },

  /**
   * Valida ano de publicação
   */
  validateAnoPublicacao(ano: number): boolean {
    return ValidationUtils.validate(ano, 'number', {
      min: 0,
      max: new Date().getFullYear()
    });
  },

  /**
   * Valida se o livro está disponível para empréstimo
   */
  validateDisponibilidade(disponivel: boolean, dataDevolucao?: Date): boolean {
    if (!disponivel) return false;
    
    if (dataDevolucao) {
      return new Date(dataDevolucao) < new Date();
    }
    
    return true;
  },

  /**
   * Valida dados parciais para atualização
   */
  validateLivroUpdate(livroData: any): ValidationResult {
    const schema: Record<string, ValidationRule | ValidationRule[]> = {};
    
    // Apenas valida campos que estão presentes
    Object.keys(livroData).forEach(key => {
      if (ValidationSchemas.livro[key]) {
        const rule = { ...ValidationSchemas.livro[key] };
        rule.required = false; // Em atualização, campos não são obrigatórios
        schema[key] = rule;
      }
    });
    
    return ValidationUtils.validateObject(livroData, schema);
  }
};

// Extensão do Request do Express para incluir validatedData
declare global {
  namespace Express {
    interface Request {
      validatedData?: any;
    }
  }
}

// Exportação padrão
export default {
  Validator,
  ValidationUtils,
  ValidationSchemas,
  validationMiddleware,
  Validate,
  LivroValidators
};