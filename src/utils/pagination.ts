export const getPagination = (page: number, limit: number) => {
  const safePage = Math.max(1, isNaN(page) ? 1 : page);
  const safeLimit = Math.max(1, Math.min(isNaN(limit) ? 10 : limit, 100));
  const offset = (safePage - 1) * safeLimit;

  return {
    page: safePage,
    limit: safeLimit,
    offset
  };
};
