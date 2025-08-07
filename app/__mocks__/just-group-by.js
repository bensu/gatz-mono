module.exports = (arr, fn) => {
  if (!Array.isArray(arr)) return {};
  const result = {};
  arr.forEach((item) => {
    const key = fn(item);
    if (!result[key]) result[key] = [];
    result[key].push(item);
  });
  return result;
};