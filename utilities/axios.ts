import axios, { AxiosError } from "axios";

const axiosInstance = axios.create({
    baseURL: "http://localhost:8000",
});

axiosInstance.interceptors.response.use(
    (response) => response.data,
    (error: AxiosError) => {
        if (error.response?.data && typeof error.response.data === 'object' && 'message' in error.response.data) {
            return Promise.reject(error.response.data.message);
        }

        if (error.message) {
            return Promise.reject({
                message: error.message,
            });
        }

        return Promise.reject({
            message: "An error occurred while processing your request",
        })
    }
);

export default axiosInstance;
