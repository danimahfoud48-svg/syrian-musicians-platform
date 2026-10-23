import axios from 'axios';

const API_URL = window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api';

const API = axios.create({
  baseURL: API_URL,
});

export default API;