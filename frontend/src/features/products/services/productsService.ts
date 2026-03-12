import apiClient from '../../../shared/services/apiClient';

export interface Product {
  id: string;
  name: string;
  price: number;
}

export const productsService = {
  fetchProducts: async (): Promise<Product[]> => {
    const response = await apiClient.get<Product[]>('/v1/products');
    return response.data;
  },
};
