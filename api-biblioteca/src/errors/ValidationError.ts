export interface ValidationErrorItem {
  field: string;
  message: string;
  value?: any;
  constraint?: string;
}

export class ValidationError extends Error {
  public readonly statusCode: number;
  public readonly errors: ValidationErrorItem[];
  public readonly isOperational: boolean;

  constructor(
    message: string,
    errors: ValidationErrorItem[],
    statusCode: number = 400
  ) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true;
    
    Object.setPrototypeOf(this, ValidationError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Transforma o erro em formato para resposta da API
   */
  public toJSON() {
    return {
      status: 'error',
      message: this.message,
      statusCode: this.statusCode,
      errors: this.errors,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Cria um ValidationError a partir de um array de erros do class-validator
   */
  static fromClassValidator(errors: any[]): ValidationError {
    const validationErrors: ValidationErrorItem[] = errors.map(error => ({
      field: error.property,
      message: Object.values(error.constraints || {}).join(', '),
      value: error.value,
      constraints: error.constraints
    }));

    return new ValidationError(
      'Erro de validação dos dados',
      validationErrors,
      422
    );
  }
}