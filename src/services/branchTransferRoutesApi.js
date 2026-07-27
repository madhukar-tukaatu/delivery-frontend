import api from "@/lib/api";


const BASE_URL = "/admin/rate/transfer-routes";

export const BranchTransferRoutesApi = {
    list(params = {}) {
        return api.get(BASE_URL, { params });
    },

    show(id) {
        return api.get(`${BASE_URL}/${id}`);
    },

    create(payload) {
        return api.post(BASE_URL, payload);
    },

    update(id, payload) {
        return api.put(`${BASE_URL}/${id}`, payload);
    },

    disable(id) {
        return api.delete(`${BASE_URL}/${id}`);
    },
};
