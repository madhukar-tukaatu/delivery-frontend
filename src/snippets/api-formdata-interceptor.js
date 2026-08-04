/*
 * Merge this logic into the existing request interceptor in @/lib/api.
 * Do not JSON.stringify FormData and do not force application/json for it.
 */
api.interceptors.request.use(
  (config) => {
    const isFormData =
      typeof FormData !== "undefined" && config.data instanceof FormData;

    if (isFormData) {
      if (config.headers) {
        delete config.headers["Content-Type"];
        delete config.headers["content-type"];

        if (typeof config.headers.delete === "function") {
          config.headers.delete("Content-Type");
          config.headers.delete("content-type");
        }
      }

      /* Never run JSON.stringify(config.data) for FormData. */
      return config;
    }

    return config;
  },
  (error) => Promise.reject(error),
);
