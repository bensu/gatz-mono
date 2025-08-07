module.exports = (obj, fn) => {
  if (!obj || typeof obj !== 'object') return {};
  const result = {};
  Object.keys(obj).forEach(key => {
    result[key] = fn(obj[key], key);
  });
  return result;
};