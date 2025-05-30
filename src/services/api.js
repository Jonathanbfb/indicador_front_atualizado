import axios from 'axios';

const api = axios.create({
  baseURL: 'http://10.6.60.38:3010/api'
});

export default api;