"use client";

import Echo from "laravel-echo";
import Pusher from "pusher-js";

let echoInstance = null;

/**
 * Return the current authentication token.
 *
 * The token is read every time a private/presence channel
 * needs authorization.
 */
function getAuthToken() {
    if (typeof window === "undefined") {
        return null;
    }

    const token =
        window.localStorage.getItem("access_token") ||
        window.localStorage.getItem("admin_token") ||
        window.localStorage.getItem("token") ||
        window.localStorage.getItem("auth_token") ||
        window.sessionStorage.getItem("access_token") ||
        window.sessionStorage.getItem("token");

    if (!token) {
        return null;
    }

    return token
        .replace(/^Bearer\s+/i, "")
        .trim();
}

/**
 * Safely read an API response.
 */
async function readResponse(response) {
    const contentType =
        response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
        try {
            return await response.json();
        } catch {
            return {
                message: `Invalid JSON response (${response.status}).`,
            };
        }
    }

    const text = await response.text();

    return {
        message:
            text ||
            `Broadcast authorization failed (${response.status}).`,
    };
}

/**
 * Get Reverb configuration.
 *
 * IMPORTANT:
 * NEXT_PUBLIC_* values are embedded into the browser bundle
 * during `next build`.
 *
 * Never fall back to localhost in production.
 */
function getReverbConfig() {
    if (typeof window === "undefined") {
        return null;
    }

    const scheme =
        process.env.NEXT_PUBLIC_REVERB_SCHEME ||
        (window.location.protocol === "https:"
            ? "https"
            : "http");

    const host =
        process.env.NEXT_PUBLIC_REVERB_HOST ||
        (
            window.location.hostname ===
            "localhost"
                ? "localhost"
                : "ws.tukaatuexpress.com"
        );

    const configuredPort = Number(
        process.env.NEXT_PUBLIC_REVERB_PORT
    );

    const port =
        Number.isFinite(configuredPort) &&
        configuredPort > 0
            ? configuredPort
            : scheme === "https"
                ? 443
                : 8080;

    const appKey =
        process.env.NEXT_PUBLIC_REVERB_APP_KEY ||
        "delivery-key";

    /*
     * IMPORTANT:
     *
     * Production fallback is API production domain.
     * We do NOT fall back to localhost here.
     */
    const apiOrigin =
        process.env.NEXT_PUBLIC_API_ORIGIN ||
        (
            window.location.hostname ===
            "localhost"
                ? "http://localhost:8081"
                : "https://api.tukaatuexpress.com"
        );

    return {
        scheme,
        host,
        port,
        appKey,
        apiOrigin: apiOrigin.replace(/\/+$/, ""),
    };
}

/**
 * Create or return the Laravel Echo instance.
 */
export function getEcho() {
    if (typeof window === "undefined") {
        return null;
    }

    if (echoInstance) {
        return echoInstance;
    }

    const config = getReverbConfig();

    if (!config) {
        return null;
    }

    const {
        scheme,
        host,
        port,
        appKey,
        apiOrigin,
    } = config;

    const secure = scheme === "https";

    window.Pusher = Pusher;

    /**
     * Never allow production to accidentally connect to localhost.
     */
    if (
        window.location.hostname !== "localhost" &&
        (
            host === "localhost" ||
            apiOrigin.includes("localhost")
        )
    ) {
        throw new Error(
            "[Reverb] Production configuration is pointing to localhost."
        );
    }

    console.info("[Reverb] Configuration", {
        apiOrigin,
        host,
        port,
        scheme,
    });

    echoInstance = new Echo({
        broadcaster: "reverb",

        key: appKey,

        wsHost: host,
        wsPort: port,
        wssPort: port,

        forceTLS: secure,

        /*
         * Reverb over HTTPS/WSS.
         */
        enabledTransports: ["ws", "wss"],

        /**
         * Authorize private and presence channels.
         */
        authorizer: (channel) => ({
            authorize: async (
                socketId,
                callback
            ) => {
                try {
                    const token =
                        getAuthToken();

                    const authUrl =
                        `${apiOrigin}/api/broadcasting/auth`;

                    console.info(
                        "[Reverb] Authorizing channel",
                        {
                            url: authUrl,
                            channel:
                                channel.name,
                            socketId,
                            hasToken:
                                Boolean(token),
                        }
                    );

                    const response =
                        await fetch(
                            authUrl,
                            {
                                method: "POST",

                                credentials:
                                    "include",

                                headers: {
                                    Accept:
                                        "application/json",

                                    "Content-Type":
                                        "application/json",

                                    ...(token
                                        ? {
                                            Authorization:
                                                `Bearer ${token}`,
                                        }
                                        : {}),
                                },

                                body:
                                    JSON.stringify(
                                        {
                                            socket_id:
                                                socketId,

                                            channel_name:
                                                channel.name,
                                        }
                                    ),
                            }
                        );

                    const body =
                        await readResponse(
                            response
                        );

                    if (!response.ok) {
                        const message =
                            body?.message ||
                            body?.error ||
                            `Broadcast authorization failed (${response.status}).`;

                        throw new Error(
                            message
                        );
                    }

                    callback(
                        false,
                        body
                    );
                } catch (error) {
                    console.error(
                        "[Reverb] Channel authorization failed",
                        error
                    );

                    callback(
                        true,
                        error
                    );
                }
            },
        }),

        disableStats: true,
    });

    window.deliveryEcho =
        echoInstance;

    const connection =
        echoInstance.connector
            ?.pusher
            ?.connection;

    connection?.bind(
        "state_change",
        ({
            previous,
            current,
        }) => {
            console.info(
                "[Reverb] State changed",
                {
                    previous,
                    current,
                }
            );
        }
    );

    connection?.bind(
        "connected",
        () => {
            console.info(
                "[Reverb] Connected",
                {
                    socketId:
                        connection.socket_id,

                    host,
                    port,
                    scheme,
                }
            );
        }
    );

    connection?.bind(
        "error",
        (error) => {
            console.error(
                "[Reverb] Connection error",
                error
            );
        }
    );

    connection?.bind(
        "disconnected",
        () => {
            console.warn(
                "[Reverb] Disconnected"
            );
        }
    );

    connection?.bind(
        "failed",
        () => {
            console.error(
                "[Reverb] Connection failed",
                {
                    host,
                    port,
                    scheme,
                }
            );
        }
    );

    return echoInstance;
}

/**
 * Disconnect and remove the existing Echo instance.
 */
export function disconnectEcho() {
    if (echoInstance) {
        try {
            echoInstance.disconnect();
        } catch (error) {
            console.warn(
                "[Reverb] Disconnect warning",
                error
            );
        }
    }

    echoInstance = null;

    if (typeof window !== "undefined") {
        delete window.deliveryEcho;
    }
}