// Utility helper functions
const formatDate = (date) => {
  return new Date(date).toLocaleDateString();
};

const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

const generateToken = () => {
  return Math.random().toString(36).substr(2);
};

module.exports = {
  formatDate,
  validateEmail,
  generateToken,
};