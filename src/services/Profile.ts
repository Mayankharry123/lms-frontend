
import apiClient from "../services/api";

export async function getUserProfile(userId: number) {
  // Assuming the endpoint is /api/v1/users/:userId and returns ApiResponse<User>
  const response = await apiClient.customRequest<Record<string, unknown>>(`/users/${userId}`);
  return response.data;
}
