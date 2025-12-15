/// <reference types="vite/client" />
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
export const api = {
    // 获取所有演出
    async getAllEvents(params) {
        const queryParams = new URLSearchParams();
        if (params?.startDate)
            queryParams.append('startDate', params.startDate);
        if (params?.endDate)
            queryParams.append('endDate', params.endDate);
        if (params?.troupe)
            queryParams.append('troupe', params.troupe);
        if (params?.city)
            queryParams.append('city', params.city);
        const response = await fetch(`${API_BASE_URL}/api/events?${queryParams}`);
        if (!response.ok)
            throw new Error('Failed to fetch events');
        return response.json();
    },
    // 根据日期获取演出
    async getEventsByDate(date) {
        const response = await fetch(`${API_BASE_URL}/api/events/by-date/${date}`);
        if (!response.ok)
            throw new Error('Failed to fetch events');
        return response.json();
    },
    // 根据月份获取演出
    async getEventsByMonth(year, month) {
        const response = await fetch(`${API_BASE_URL}/api/events/by-month/${year}/${month}`);
        if (!response.ok)
            throw new Error('Failed to fetch events');
        return response.json();
    },
    // 添加演出
    async createEvent(event) {
        const response = await fetch(`${API_BASE_URL}/api/events`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(event),
        });
        if (!response.ok)
            throw new Error('Failed to create event');
        return response.json();
    },
    // 更新演出
    async updateEvent(id, event) {
        const response = await fetch(`${API_BASE_URL}/api/events/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(event),
        });
        if (!response.ok)
            throw new Error('Failed to update event');
        return response.json();
    },
    // 删除演出
    async deleteEvent(id) {
        const response = await fetch(`${API_BASE_URL}/api/events/${id}`, {
            method: 'DELETE',
        });
        if (!response.ok)
            throw new Error('Failed to delete event');
        return response.json();
    },
    // 获取剧团列表
    async getTroupes() {
        const response = await fetch(`${API_BASE_URL}/api/troupes`);
        if (!response.ok)
            throw new Error('Failed to fetch troupes');
        return response.json();
    },
    // 获取城市列表
    async getCities() {
        const response = await fetch(`${API_BASE_URL}/api/cities`);
        if (!response.ok)
            throw new Error('Failed to fetch cities');
        return response.json();
    },
};
