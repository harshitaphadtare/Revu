import { API_BASE_URL, ApiResponse, ApiError } from './index';

export interface ReviewAnalysis {
  id: string;
  productName: string;
  totalReviews: number;
  averageRating: number;
  summary: string;
  sentimentData: {
    positive: number;
    neutral: number;
    negative: number;
  };
  positiveThemes: Array<{ name: string; value: number }>;
  negativeThemes: Array<{ name: string; value: number }>;
  reviews: Array<{
    id: number;
    text: string;
    rating: number;
    sentiment: string;
    date: string;
  }>;
}

export const analyzeReviews = async (url: string): Promise<ApiResponse<ReviewAnalysis>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      throw new ApiError(response.status, 'Failed to analyze reviews');
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, 'Network error occurred');
  }
};
