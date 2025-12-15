/// <reference types="vite/client" />

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface Event {
  id: number;
  date: string;
  type?: string;
  troupe: string;
  city: string;
  location: string;
  content: string;
  created_at?: string;
}

export const api = {
  // 获取所有演出
  async getAllEvents(params?: {
    startDate?: string;
    endDate?: string;
    troupe?: string;
    city?: string;
  }): Promise<Event[]> {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    if (params?.troupe) queryParams.append('troupe', params.troupe);
    if (params?.city) queryParams.append('city', params.city);

    const response = await fetch(`${API_BASE_URL}/api/events?${queryParams}`);
    if (!response.ok) throw new Error('Failed to fetch events');
    return response.json();
  },

  // 根据日期获取演出
  async getEventsByDate(date: string): Promise<Event[]> {
    const response = await fetch(`${API_BASE_URL}/api/events/by-date/${date}`);
    if (!response.ok) throw new Error('Failed to fetch events');
    return response.json();
  },

  // 根据月份获取演出
  async getEventsByMonth(year: number, month: number): Promise<Event[]> {
    const response = await fetch(
      `${API_BASE_URL}/api/events/by-month/${year}/${month}`
    );
    if (!response.ok) throw new Error('Failed to fetch events');
    return response.json();
  },

  // 添加演出
  async createEvent(event: Omit<Event, 'id' | 'created_at'>): Promise<{ id: number; message: string }> {
    const response = await fetch(`${API_BASE_URL}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });
    if (!response.ok) throw new Error('Failed to create event');
    return response.json();
  },

  // 更新演出
  async updateEvent(id: number, event: Omit<Event, 'id' | 'created_at'>): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/api/events/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });
    if (!response.ok) throw new Error('Failed to update event');
    return response.json();
  },

  // 删除演出
  async deleteEvent(id: number): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/api/events/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete event');
    return response.json();
  },

  // 获取剧团列表
  async getTroupes(): Promise<string[]> {
    const response = await fetch(`${API_BASE_URL}/api/troupes`);
    if (!response.ok) throw new Error('Failed to fetch troupes');
    return response.json();
  },

  // 获取城市列表
  async getCities(): Promise<string[]> {
    const response = await fetch(`${API_BASE_URL}/api/cities`);
    if (!response.ok) throw new Error('Failed to fetch cities');
    return response.json();
  },
};
