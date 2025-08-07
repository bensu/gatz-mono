import React from "react";

let AppEntryPoint: React.ComponentType<any>;
if (process.env.EXPO_PUBLIC_ENV_NAME === "development") {
    AppEntryPoint = require("../../stories").default;
}

export default AppEntryPoint;

