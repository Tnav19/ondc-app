import { makeStyles } from "@mui/styles";
import palette from "../../../utils/Theme/palette";

const moreImageContainer = (size, borderColor) => ({
  height: size,
  width: size,
  border: "1px solid",
  borderColor: borderColor,
  overflow: "hidden",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
});

const useStyles = makeStyles({
  headingContainer: {
    backgroundColor: palette.background.paper,
    height: 70,
    width: "100%",
    padding: "0 40px",
    display: "flex",
    alignItems: "center",
  },
  heading: {
    textTransform: "none !important",
    fontFamily: "Inter !important",
  },
  cartContainer: {
    padding: "10px 40px",
    backgroundColor: "#F9F9F9",
  },
  tableHead: {
    fontWeight: "600 !important",
  },
  moreImages: {
    ...moreImageContainer(110, "lightgrey"),
    marginRight: "14px",
    borderRadius: 10,
    padding: 4,
    backgroundColor: "#ffffff",
  },
  greyContainer: {
    ...moreImageContainer("100%", "#e7e7e7"),
    backgroundColor: "#e7e7e7",
    borderRadius: 8,
    position: "relative",
  },
  moreImage: {
    height: 80,
    objectFit: "contain",
  },
  logoContainer: {
    height: 25,
    width: 25,
    marginRight: 4,
  },
  logo: {
    height: "100%",
    width: "100%",
  },
  qtyContainer: {
    border: "1px solid #E8E8E8",
    borderRadius: 6,
    height: 35,
    maxWidth: 64,
    minWidth: 64,
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  qtyArrowUp: {
    position: "absolute",
    top: 0,
    right: 2,
    color: "#A2A6B0",
    fontSize: "18px !important",
    cursor: "pointer",
  },
  qtyArrowDown: {
    position: "absolute",
    bottom: 0,
    right: 2,
    color: "#A2A6B0",
    fontSize: "18px !important",
    cursor: "pointer",
  },
  summaryCard: {
    marginTop: 20,
    width: 470,
    padding: "16px 24px",
    display: "flex",
    flexDirection: "column",
  },
  summaryTypo: {
    fontFamily: "Inter !important",
    fontWeight: "600 !important",
    marginBottom: "20px",
  },
  summaryLabel: {
    fontSize: "13px !important",
    fontWeight: "600 !important",
  },
  emptyCartScreen: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background: "#F9F9F9",
    height: "80vh",
  },
  infoBox: {
    borderRadius: "8px",
    background: "rgba(249, 197, 28, 0.17)",
    padding: "8px 16px",
    width: "max-content",
    marginTop: "20px",
  },
  infoText: {
    fontFamily: "Inter !important",
    fontSize: 14,
    fontWeight: "500 !important",
    color: "#C89A04",
  },
  loadingContainer: {
    height: "70vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  updateBtn: {
    position: "absolute !important",
    right: 12,
    bottom: 7,
  },
  square: {
    backgroundColor: "#ffffff",
    border: "1px solid #008001",
    width: 14,
    height: 15,
    marginRight: 6,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  circle: {
    backgroundColor: "#008001",
    borderRadius: "50%",
    height: "9px",
    width: "9px",
  },
  tagContainer: {
    position: "absolute",
    top: 4,
    left: 4,
  },
});

export default useStyles;
