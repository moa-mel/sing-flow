

export function buildResponse<TData extends Record<string, any> = Record<string, any>>(
  options: Omit<ApiResponse<TData>, 'success'>,
): ApiResponse<TData> {
  return {
    success: true,
    message: options.message,
    data: options.data ?? ({} as any),
  };
}