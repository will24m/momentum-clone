var config = {
    content: ["./newtab.html", "./src/**/*.{ts,tsx}", "../shared/**/*.{ts,tsx}"],
    theme: {
        extend: {
            colors: {
                shell: {
                    50: "#f7f6f1",
                    100: "#efeee6",
                    200: "#dedccd",
                    700: "#494844",
                    900: "#1b1b19",
                },
            },
            boxShadow: {
                shell: "0 24px 60px rgba(33, 33, 28, 0.12)",
                glass: "0 14px 40px rgba(33, 33, 28, 0.16)",
            },
            borderRadius: {
                "4xl": "2rem",
            },
            keyframes: {
                "fade-up": {
                    "0%": { opacity: "0", transform: "translateY(12px)" },
                    "100%": { opacity: "1", transform: "translateY(0)" },
                },
                pulseSoft: {
                    "0%, 100%": { opacity: "1" },
                    "50%": { opacity: "0.65" },
                },
            },
            animation: {
                "fade-up": "fade-up 420ms ease-out",
                pulseSoft: "pulseSoft 1.5s ease-in-out infinite",
            },
            fontFamily: {
                sans: ['"Avenir Next"', '"Segoe UI Variable"', '"Helvetica Neue"', "sans-serif"],
            },
        },
    },
    plugins: [],
};
export default config;
