import React, { useContext, useEffect, useState } from "react";
import useStyles from "./style";
import { useHistory, useLocation, useParams } from "react-router-dom";

import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";

import {
  PRODUCT_SUBCATEGORY,
  categoryList,
} from "../../../constants/categories";
import Tooltip from "@mui/material/Tooltip";
import Card from "@mui/material/Card";
import no_image_found from "../../../assets/images/no_image_found.png";

import Pagination from "@mui/material/Pagination";
import PaginationItem from "@mui/material/PaginationItem";
import IconButton from "@mui/material/IconButton";
import { ReactComponent as PreviousIcon } from "../../../assets/images/previous.svg";
import { ReactComponent as NextIcon } from "../../../assets/images/next.svg";
import { SearchContext } from "../../../context/searchContext";

import { ToastContext } from "../../../context/toastContext";
import { toast_actions, toast_types } from "../../shared/toast/utils/toast";

import { getAllOffersRequest } from "../../../api/offer.api";
import useCancellablePromise from "../../../api/cancelRequest";

import Offers from "../../common/Offers/Offers";
import { AddCookie, getValueFromCookie } from "../../../utils/cookies";

const SubCaregoryCard = ({ data, onMouseOver, isActive = false }) => {
  const classes = useStyles();
  const history = useHistory();
  const locationData = useLocation();
  const useQuery = () => {
    const { search } = locationData;
    return React.useMemo(() => new URLSearchParams(search), [search]);
  };
  let query = useQuery();
  const categoryName = query.get("c");
  const updateQueryParams = () => {
    const params = new URLSearchParams({});
    if (locationData.search === "" && query.get("c") === null) {
      params.set("sc", data.value);
      history.push({
        pathname: `/application/products`,
        search: params.toString(),
      });
    } else {
      params.set("c", categoryName);
      params.set("sc", data.value);
      history.push({
        pathname: `/application/products`,
        search: params.toString(),
      });
    }
  };
  return (
    <>
      <Tooltip title={data.value}>
        <Card
          className={`${classes.subCatCard} ${
            isActive ? classes.isActive : ""
          }`}
          onMouseOver={onMouseOver}
          onClick={() => updateQueryParams()}
        >
          <img
            className={classes.subCatImage}
            src={data.imageUrl ? data.imageUrl : no_image_found}
            alt={`sub-cat-img-${data.value}`}
          />
        </Card>
        <Typography
          component="div"
          variant="subtitle1"
          className={classes.subCatNameTypo}
        >
          {data?.value || ""}
        </Typography>
      </Tooltip>
    </>
  );
};

const SubCategories = () => {
  // let { categoryName } = useParams();
  const classes = useStyles();
  const [activeSubCatIndex, setActiveSubCatIndex] = useState(0);
  const [subCatList, setSubCatList] = useState([]);
  const locationData = useLocation();
  const [page, setPage] = useState(0);
  const { locationData: deliveryAddressLocation } = useContext(SearchContext);
  const [screenWidth, setScreenWidth] = useState(window.innerWidth);

  const [offers, setOffers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const dispatch = useContext(ToastContext);

  // HOOKS
  const { cancellablePromise } = useCancellablePromise();

  function handleResize() {
    const width = window.innerWidth;
    setScreenWidth(width);
  }
  useEffect(() => {
    window.addEventListener("resize", handleResize);
  }, []);

  const useQuery = () => {
    const { search } = locationData;
    return React.useMemo(() => new URLSearchParams(search), [search]);
  };
  let query = useQuery();
  const categoryName = query.get("c");

  useEffect(() => {
    if (categoryName) {
      setPage(0);
      const options = PRODUCT_SUBCATEGORY[categoryName];
      setSubCatList(options || []);
      getAllOffers();
    }
  }, [categoryName, deliveryAddressLocation]);

  const getAllOffers = async () => {
    setIsLoading(true);
    try {
      // const lat = "12.992906760898983";
      // const lng = "77.76323574850733";
      const latLongInfo = JSON.parse(getValueFromCookie("LatLongInfo"));
      console.log("LAT", latLongInfo);
      const lat = latLongInfo.lat;
      const lng = latLongInfo.lng;
      const findCategory = categoryName
        ? categoryList.find((item) => item.shortName === categoryName)
        : null;
      const domain = findCategory ? findCategory.domain : "";
      const data = await cancellablePromise(
        getAllOffersRequest(domain, lat, lng)
      );
      setOffers(data);
    } catch (err) {
      dispatch({
        type: toast_actions.ADD_TOAST,
        payload: {
          id: Math.floor(Math.random() * 100),
          type: toast_types.error,
          message: err?.response?.data?.error?.message,
        },
      });
    } finally {
      setIsLoading(false);
    }
  };

  const rowsPerPage = parseInt(screenWidth / 120) - 5;
  const totalPageCount = Math.ceil(subCatList.length / rowsPerPage);
  return (
    <Grid container spacing={3} className={classes.subCatContainerMain}>
      {offers && offers.length > 0 && (
        <Grid item xs={12} sm={12} md={12} lg={12} xl={12}>
          <Offers offersList={offers} />
        </Grid>
      )}
      <Grid item xs={12} sm={12} md={12} lg={12} xl={12}>
        <Typography variant="h4">Shop By Category</Typography>
      </Grid>
      <Grid
        item
        xs={12}
        sm={12}
        md={12}
        lg={12}
        xl={12}
        className={classes.subCatContainer}
      >
        <div
          style={{
            marginLeft: "auto",
            marginTop: "auto",
            marginBottom: "auto",
          }}
        >
          <IconButton
            color="inherit"
            className={classes.actionButton}
            onClick={() => {
              setPage(page - 1);
              // setActiveSubCatIndex(activeSubCatIndex-1)
            }}
            disabled={page === 0}
          >
            <PreviousIcon />
          </IconButton>
        </div>
        {subCatList
          .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
          .map((subCat, subCatIndex) => (
            <SubCaregoryCard
              key={`sub-cat-index-${subCatIndex}`}
              data={subCat}
              // isActive={subCatIndex === activeSubCatIndex}
              onMouseOver={() => {
                setActiveSubCatIndex(subCatIndex);
              }}
            />
          ))}
        <div
          style={{
            marginRight: "auto",
            marginTop: "auto",
            marginBottom: "auto",
          }}
        >
          <IconButton
            color="inherit"
            className={classes.actionButton}
            onClick={() => {
              setPage(page + 1);
              // setActiveSubCatIndex(activeSubCatIndex+1)
            }}
            disabled={page === totalPageCount - 1}
          >
            <NextIcon />
          </IconButton>
        </div>
      </Grid>
    </Grid>
  );
};

export default SubCategories;
