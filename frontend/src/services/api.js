import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:8000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// File upload
export const uploadFile = async (file, summarizeLevel = 'balanced') => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('summarize_level', summarizeLevel);

  try {
    const response = await axios.post(`${API_BASE_URL}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    const errorMsg = error.response?.data?.detail || 
                     error.message || 
                     'File upload failed. Please check the file and try again.';
    throw new Error(errorMsg);
  }
};

// Generate cheat sheet
export const generateCheatSheet = async (text) => {
  try {
    const response = await apiClient.post('/cheat-sheet', { text });
    return response.data;
  } catch (error) {
    const errorMsg = error.response?.data?.detail || 
                     error.message || 
                     'Failed to generate cheat sheet';
    throw new Error(errorMsg);
  }
};

// Generate questions
export const generateQuestions = async (text) => {
  try {
    const response = await apiClient.post('/questions', { text });
    return response.data;
  } catch (error) {
    const errorMsg = error.response?.data?.detail || 
                     error.message || 
                     'Failed to generate questions';
    throw new Error(errorMsg);
  }
};

// Generate MCQ quiz
export const generateQuiz = async (text, difficulty = 'beginner') => {
  try {
    const response = await apiClient.post('/quiz', { text, difficulty });
    return response.data;
  } catch (error) {
    const errorMsg = error.response?.data?.detail || 
                     error.message || 
                     'Failed to generate quiz';
    throw new Error(errorMsg);
  }
};

// Get YouTube suggestions
export const getYouTubeSuggestions = async (text) => {
  try {
    const response = await apiClient.post('/youtube', { text });
    return response.data;
  } catch (error) {
    const errorMsg = error.response?.data?.detail || 
                     error.message || 
                     'Failed to get YouTube suggestions';
    throw new Error(errorMsg);
  }
};

// Generate diagram
export const generateDiagram = async (text) => {
  try {
    const response = await apiClient.post('/diagram', { text });
    return response.data;
  } catch (error) {
    const errorMsg = error.response?.data?.detail || 
                     error.message || 
                     'Failed to generate diagram';
    throw new Error(errorMsg);
  }
};

// Study Mode: generate any feature
export const generateStudyFeature = async (mode, feature, text) => {
  try {
    const response = await apiClient.post('/study-mode/generate', { mode, feature, text });
    return response.data;
  } catch (error) {
    const errorMsg = error.response?.data?.detail || 
                     error.message || 
                     'Failed to generate study content';
    throw new Error(errorMsg);
  }
};

// Study Mode: AI Tutor conversation
export const generateAiTutorResponse = async (text, question) => {
  try {
    const response = await apiClient.post('/study-mode/ai-tutor', { text, question });
    return response.data;
  } catch (error) {
    const errorMsg = error.response?.data?.detail || 
                     error.message || 
                     'Failed to get tutor response';
    throw new Error(errorMsg);
  }
};

export default apiClient;
