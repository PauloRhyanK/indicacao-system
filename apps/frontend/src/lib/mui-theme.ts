import { createTheme } from "@mui/material/styles";

export const caisMuiTheme = createTheme({
  palette: {
    primary: { main: "#002B49" },
    secondary: { main: "#d9bd7e" },
    text: { primary: "#081421", secondary: "#64748b" },
    background: { default: "#ffffff", paper: "#ffffff" },
  },
  typography: {
    fontFamily: "inherit",
    fontSize: 13,
  },
});
