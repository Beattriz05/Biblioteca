import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';
import { ValidationError, ValidationErrorItem } from '../errors/ValidationError'; // Adicione o import

interface ErrorResponse {
  status: 'error';
  message: string;
  statusCode: number;
  timestamp: string;
  path?: string;
  errors?: ValidationErrorItem[]; // Altere para ValidationErrorItem[]
  stack?: string;
}

export class ErrorHandler {
  /**
   * Middleware principal de tratamento de erros
   */
  public static handle(
    error: Error,
    req: Request,
    res: Response,
    next: NextFunction
  ): void {
    console.error('📛 ERRO:', {
      message: error.message,
      stack: error.stack,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      timestamp: new Date().toISOString()
    });

    // Se for um erro de validação
    if (error instanceof ValidationError) {
      const response: ErrorResponse = {
        status: 'error',
        message: error.message,
        statusCode: error.statusCode,
        timestamp: new Date().toISOString(),
        path: req.originalUrl,
        errors: error.errors // Agora é compatível
      };
      res.status(error.statusCode).json(response);
      return;
    }

    // Restante do código permanece igual...
    // Se for um AppError (erro operacional)
    if (error instanceof AppError) {
      const response: ErrorResponse = {
        status: 'error',
        message: error.message,
        statusCode: error.statusCode,
        timestamp: new Date().toISOString(),
        path: req.originalUrl
      };
      res.status(error.statusCode).json(response);
      return;
    }

    // Se for um erro de sintaxe JSON
    if (error instanceof SyntaxError && 'body' in error) {
      const response: ErrorResponse = {
        status: 'error',
        message: 'JSON inválido no corpo da requisição',
        statusCode: 400,
        timestamp: new Date().toISOString(),
        path: req.originalUrl
      };
      res.status(400).json(response);
      return;
    }

    // Erro de banco de dados
    if (error.name === 'QueryFailedError') {
      const response: ErrorResponse = {
        status: 'error',
        message: 'Erro no banco de dados',
        statusCode: 500,
        timestamp: new Date().toISOString(),
        path: req.originalUrl,
        ...(process.env.NODE_ENV === 'development' && { 
          details: error.message 
        })
      };
      res.status(500).json(response);
      return;
    }

    // Erro de validação do TypeORM
    if (error.name === 'EntityPropertyNotFoundError') {
      const response: ErrorResponse = {
        status: 'error',
        message: 'Propriedade da entidade não encontrada',
        statusCode: 400,
        timestamp: new Date().toISOString(),
        path: req.originalUrl
      };
      res.status(400).json(response);
      return;
    }

    // Erro 404 - Rota não encontrada (deve ser tratado no app.ts)
    if ((error as any).statusCode === 404) {
      const response: ErrorResponse = {
        status: 'error',
        message: error.message || 'Rota não encontrada',
        statusCode: 404,
        timestamp: new Date().toISOString(),
        path: req.originalUrl
      };
      res.status(404).json(response);
      return;
    }

    // Erro genérico (não tratado)
    const response: ErrorResponse = {
      status: 'error',
      message: process.env.NODE_ENV === 'production' 
        ? 'Erro interno do servidor' 
        : error.message,
      statusCode: 500,
      timestamp: new Date().toISOString(),
      path: req.originalUrl,
      ...(process.env.NODE_ENV === 'development' && { 
        stack: error.stack 
      })
    };

    res.status(500).json(response);
  }

  // Restante do código permanece igual...
  /**
   * Middleware para capturar erros 404
   */
  public static notFound(req: Request, res: Response, next: NextFunction): void {
    const error = new AppError(
      `Rota não encontrada: ${req.method} ${req.originalUrl}`,
      404
    );
    next(error);
  }

  /**
   * Middleware para tratamento de erros assíncronos
   */
  public static catchAsync(fn: Function) {
    return (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  /**
   * Log de erros para diferentes ambientes
   */
  private static logError(error: Error, req: Request): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      message: error.message,
      stack: error.stack,
      request: {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      },
      environment: process.env.NODE_ENV
    };

    // Log detalhado em desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      console.error('ERRO DETALHADO:', JSON.stringify(logEntry, null, 2));
    } else {
      // Em produção, log apenas informações essenciais
      console.error(' ERRO:', {
        message: error.message,
        url: req.originalUrl,
        timestamp: logEntry.timestamp
      });
    }
  }
}

// Middleware exportável
export const errorMiddleware = ErrorHandler.handle;
export const notFoundMiddleware = ErrorHandler.notFound;
export const catchAsync = ErrorHandler.catchAsync;