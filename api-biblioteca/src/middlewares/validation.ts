import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain, body, param, query } from 'express-validator';
import { ValidationError, ValidationErrorItem } from '../errors/ValidationError';

/**
 * Validador centralizado para express-validator
 */
export const validate = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Executa todas as validações
      for (const validation of validations) {
        await validation.run(req);
      }

      // Verifica se houve erros
      const errors = validationResult(req);
      
      if (!errors.isEmpty()) {
        const validationErrors: ValidationErrorItem[] = errors.array().map((error: any) => ({
          field: error.path || 'unknown',
          message: error.msg,
          value: error.value,
          constraint: error.type,
          location: error.location
        }));

        throw new ValidationError('Dados inválidos', validationErrors, 422);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Sanitização de dados de entrada
 */
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  // Sanitiza strings (remove tags HTML e espaços desnecessários)
  const sanitizeString = (value: any): any => {
    if (typeof value === 'string') {
      return value
        .replace(/<[^>]*>/g, '') // Remove tags HTML
        .trim() // Remove espaços no início e fim
        .replace(/\s+/g, ' '); // Remove múltiplos espaços
    }
    return value;
  };

  // Aplica sanitização em todos os níveis do body, query e params
  const sanitizeObject = (obj: any): any => {
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    } else if (obj !== null && typeof obj === 'object') {
      return Object.keys(obj).reduce((acc, key) => {
        acc[key] = sanitizeObject(obj[key]);
        return acc;
      }, {} as any);
    } else if (typeof obj === 'string') {
      return sanitizeString(obj);
    }
    return obj;
  };

  // Aplica sanitização
  if (req.body) req.body = sanitizeObject(req.body);
  if (req.query) req.query = sanitizeObject(req.query);
  if (req.params) req.params = sanitizeObject(req.params);

  next();
};

/**
 * Validação específica para livros
 */
export const livroValidators = {
  // Validação para criação de livro
  criar: validate([
    body('titulo')
      .trim()
      .notEmpty().withMessage('Título é obrigatório')
      .isLength({ min: 2, max: 200 }).withMessage('Título deve ter entre 2 e 200 caracteres')
      .matches(/^[a-zA-ZÀ-ÿ0-9\s\-_,.:;!?]+$/).withMessage('Título contém caracteres inválidos'),

    body('autor')
      .trim()
      .notEmpty().withMessage('Autor é obrigatório')
      .isLength({ min: 3, max: 100 }).withMessage('Autor deve ter entre 3 e 100 caracteres')
      .matches(/^[a-zA-ZÀ-ÿ\s.]+$/).withMessage('Nome do autor contém caracteres inválidos'),

    body('isbn')
      .trim()
      .notEmpty().withMessage('ISBN é obrigatório')
      .isLength({ min: 10, max: 17 }).withMessage('ISBN deve ter entre 10 e 17 caracteres')
      .matches(/^(97(8|9))?\d{9}(\d|X)$/i).withMessage('ISBN inválido. Use ISBN-10 ou ISBN-13'),

    body('anoPublicacao')
      .optional()
      .isInt({ min: 0, max: new Date().getFullYear() })
      .withMessage(`Ano de publicação deve ser entre 0 e ${new Date().getFullYear()}`)
      .toInt(),

    body('disponivel')
      .optional()
      .isBoolean().withMessage('Disponível deve ser verdadeiro ou falso')
      .toBoolean()
  ]),

  // Validação para atualização de livro
  atualizar: validate([
    param('id')
      .isInt({ min: 1 }).withMessage('ID deve ser um número inteiro positivo')
      .toInt(),

    body('titulo')
      .optional()
      .trim()
      .isLength({ min: 2, max: 200 }).withMessage('Título deve ter entre 2 e 200 caracteres')
      .matches(/^[a-zA-ZÀ-ÿ0-9\s\-_,.:;!?]+$/).withMessage('Título contém caracteres inválidos'),

    body('autor')
      .optional()
      .trim()
      .isLength({ min: 3, max: 100 }).withMessage('Autor deve ter entre 3 e 100 caracteres')
      .matches(/^[a-zA-ZÀ-ÿ\s.]+$/).withMessage('Nome do autor contém caracteres inválidos'),

    body('isbn')
      .optional()
      .trim()
      .isLength({ min: 10, max: 17 }).withMessage('ISBN deve ter entre 10 e 17 caracteres')
      .matches(/^(97(8|9))?\d{9}(\d|X)$/i).withMessage('ISBN inválido. Use ISBN-10 ou ISBN-13'),

    body('anoPublicacao')
      .optional()
      .isInt({ min: 0, max: new Date().getFullYear() })
      .withMessage(`Ano de publicação deve ser entre 0 e ${new Date().getFullYear()}`)
      .toInt(),

    body('disponivel')
      .optional()
      .isBoolean().withMessage('Disponível deve ser verdadeiro ou falso')
      .toBoolean()
  ]),

  // Validação para ID em parâmetros
  idParam: validate([
    param('id')
      .isInt({ min: 1 }).withMessage('ID deve ser um número inteiro positivo')
      .toInt()
  ]),

  // Validação para busca
  buscar: validate([
    query('pagina')
      .optional()
      .isInt({ min: 1 }).withMessage('Página deve ser um número maior que 0')
      .toInt()
      .default(1),

    query('limite')
      .optional()
      .isInt({ min: 1, max: 100 }).withMessage('Limite deve ser entre 1 e 100')
      .toInt()
      .default(10),

    query('autor')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 }).withMessage('Autor deve ter entre 2 e 100 caracteres'),

    query('titulo')
      .optional()
      .trim()
      .isLength({ min: 2, max: 200 }).withMessage('Título deve ter entre 2 e 200 caracteres'),

    query('disponivel')
      .optional()
      .isBoolean().withMessage('Disponível deve ser verdadeiro ou falso')
      .toBoolean()
  ])
};

/**
 * Validação para filtros de data
 */
export const dataValidators = {
  dataInicioFim: validate([
    query('dataInicio')
      .optional()
      .isISO8601().withMessage('Data de início deve estar no formato ISO 8601 (YYYY-MM-DD)')
      .toDate()
      .custom((value: Date, { req }) => {
        // Extrair query params de forma segura
        const { dataInicio, dataFim } = req.query as { 
          dataInicio?: string; 
          dataFim?: string 
        };
        
        if (dataInicio && dataFim && value) {
          const dataFimDate = new Date(dataFim);
          if (value > dataFimDate) {
            throw new Error('Data de início deve ser menor que data de fim');
          }
        }
        return true;
      }),

    query('dataFim')
      .optional()
      .isISO8601().withMessage('Data de fim deve estar no formato ISO 8601 (YYYY-MM-DD)')
      .toDate()
      .custom((value: Date, { req }) => {
        // Extrair query params de forma segura
        const { dataInicio } = req.query as { 
          dataInicio?: string 
        };
        
        if (dataInicio && value) {
          const dataInicioDate = new Date(dataInicio);
          if (value < dataInicioDate) {
            throw new Error('Data de fim deve ser maior que data de início');
          }
        }
        return true;
      })
  ])
};

/**
 * Validação de paginação
 */
export const paginacaoValidators = validate([
  query('pagina')
    .optional()
    .isInt({ min: 1 }).withMessage('Página deve ser um número maior que 0')
    .toInt()
    .default(1),

  query('limite')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limite deve ser entre 1 e 100')
    .toInt()
    .default(10),

  query('ordenarPor')
    .optional()
    .isIn(['titulo', 'autor', 'anoPublicacao', 'dataCriacao'])
    .withMessage('Campo de ordenação inválido'),

  query('ordem')
    .optional()
    .isIn(['ASC', 'DESC', 'asc', 'desc'])
    .withMessage('Ordem deve ser ASC ou DESC')
    .toUpperCase()
]);

/**
 * Validação de arquivos (se houver upload)
 */
export const fileValidators = {
  imagem: validate([
    body('imagem')
      .optional()
      .custom((value) => {
        if (!value) return true;
        
        // Verifica se é base64
        const base64Regex = /^data:image\/(png|jpg|jpeg|gif);base64,[A-Za-z0-9+/]+=*$/;
        if (!base64Regex.test(value)) {
          throw new Error('Imagem deve estar em formato base64 válido');
        }
        
        // Valida tamanho máximo (5MB)
        const maxSize = 5 * 1024 * 1024;
        const base64Data = value.split(',')[1];
        const tamanho = Buffer.from(base64Data, 'base64').length;
        
        if (tamanho > maxSize) {
          throw new Error('Imagem muito grande. Tamanho máximo: 5MB');
        }
        return true;
      })
  ])
};

/**
 * Middleware para validar Content-Type
 */
export const validateContentType = (allowedTypes: string[] = ['application/json']) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentType = req.headers['content-type'];
    
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
      if (!contentType || !allowedTypes.some(type => contentType.includes(type))) {
        throw new ValidationError(
          'Content-Type inválido',
          [{
            field: 'Content-Type',
            message: `Content-Type deve ser: ${allowedTypes.join(', ')}`,
            value: contentType
          }],
          415
        );
      }
    }
    
    next();
  };
};

/**
 * Validador dinâmico baseado em schema
 */
export const createValidator = (schema: Record<string, any>) => {
  const validations: ValidationChain[] = [];

  Object.entries(schema).forEach(([field, rules]: [string, any]) => {
    let validator: ValidationChain;

    if (rules.location === 'param') {
      validator = param(field);
    } else if (rules.location === 'query') {
      validator = query(field);
    } else {
      validator = body(field);
    }

    // Aplica regras
    if (rules.required) {
      validator = validator.notEmpty().withMessage(`${field} é obrigatório`);
    }

    if (rules.type === 'string') {
      if (rules.minLength) {
        validator = validator.isLength({ min: rules.minLength })
          .withMessage(`${field} deve ter no mínimo ${rules.minLength} caracteres`);
      }
      if (rules.maxLength) {
        validator = validator.isLength({ max: rules.maxLength })
          .withMessage(`${field} deve ter no máximo ${rules.maxLength} caracteres`);
      }
      if (rules.pattern) {
        validator = validator.matches(rules.pattern)
          .withMessage(`${field} possui formato inválido`);
      }
    }

    if (rules.type === 'number') {
      validator = validator.isNumeric().withMessage(`${field} deve ser um número`);
      if (rules.min !== undefined) {
        validator = validator.isFloat({ min: rules.min })
          .withMessage(`${field} deve ser maior ou igual a ${rules.min}`);
      }
      if (rules.max !== undefined) {
        validator = validator.isFloat({ max: rules.max })
          .withMessage(`${field} deve ser menor ou igual a ${rules.max}`);
      }
    }

    if (rules.type === 'boolean') {
      validator = validator.isBoolean().withMessage(`${field} deve ser verdadeiro ou falso`);
    }

    if (rules.type === 'email') {
      validator = validator.isEmail().withMessage(`${field} deve ser um email válido`);
    }

    validations.push(validator);
  });

  return validate(validations);
};

// Exporta todos os validadores
export default {
  validate,
  sanitizeInput,
  livroValidators,
  dataValidators,
  paginacaoValidators,
  fileValidators,
  validateContentType,
  createValidator
};