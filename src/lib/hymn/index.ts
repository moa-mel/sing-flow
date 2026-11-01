import Axios, {
    AxiosError,
    AxiosInstance,
} from 'axios';

import { HymnOptions } from './interfaces';
import { HymnGenericError, HymnValidationError } from './errors';

export class HymnLib {
    private axios: AxiosInstance;

    constructor(protected instanceOptions: HymnOptions) {
        this.axios = Axios.create({
            baseURL: `${this.instanceOptions.baseUrl}`,
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
        });
    }

    private handleErrors(error: AxiosError<any>): never {
        switch (error.response?.status) {
            case 400:
                throw new HymnValidationError(error.response.data?.message);

            default:
                throw new HymnGenericError(
                    error.response?.data?.message || error.message,
                );
        }
    }

    async fetchAllHymn() {
        try {
            const { data } = await this.axios.get("/api/hymns.json");
            return data;
        } catch (error) {
            if (!Axios.isAxiosError(error)) throw error;
            this.handleErrors(error);
        }
    }

    async fetchHymnById(id: number) {
        try {
            const { data } = await this.axios.get(`/api/hymns/${id}.json`);
            return data;
        } catch (error) {
            if (!Axios.isAxiosError(error)) throw error;
            this.handleErrors(error);
        }
    }

    async fetchHymnByCategories(categoryId: number) {
        try {
            const { data } = await this.axios.get(
                `/api/categories/${categoryId}.json`,
            );
            return data;
        } catch (error) {
            if (!Axios.isAxiosError(error)) throw error;
            this.handleErrors(error);
        }
    }
}