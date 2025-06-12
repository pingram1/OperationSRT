export const loginUser = async (email, password) => {
  const response = await fetch('/api/auth/login', { // This talks to your server
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await response.json(); // Gets the user data & token from the server
  return data;
};