export const successResponse = <T>(message: string, data: T) => {
  return {
    success: true,
    message,
    data,
  };
};

export const errorResponse = (message: string, status = 400, data: any = null) => {
  return {
    success: false,
    message,
    data,
    status,
  };
};
