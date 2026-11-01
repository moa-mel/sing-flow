export class HymnError extends Error {
  name = 'HymnError';
  status: number;
}

export class HymnGenericError extends HymnError {
  name = 'HymnGenericError';
}

export class HymnValidationError extends HymnError {
  name = 'HymnValidationError';
}