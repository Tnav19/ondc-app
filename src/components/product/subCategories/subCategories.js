import React, { useContext, useEffect, useState } from "react";
import useStyles from "./style";
import { useHistory, useLocation, useParams } from "react-router-dom";
import { PRODUCT_SUBCATEGORY } from "../../../constants/categories";
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";
import Pagination from "@mui/material/Pagination";
import PaginationItem from "@mui/material/PaginationItem";
import IconButton from "@mui/material/IconButton";
import { ReactComponent as PreviousIcon } from "../../../assets/images/previous.svg";
import { ReactComponent as NextIcon } from "../../../assets/images/next.svg";
import { ReactComponent as AllIcon } from "../../../assets/images/all.svg";
import { SearchContext } from "../../../context/searchContext";

const SingleCategory = ({ data, index }) => {
  // let { categoryName, subCategoryName } = useParams();
  const classes = useStyles();
  const history = useHistory();
  const locationData = useLocation();
  const useQuery = () => {
    const { search } = locationData;
    return React.useMemo(() => new URLSearchParams(search), [search]);
  };
  let query = useQuery();
  const categoryName = query.get("c");
  const subCategoryName = query.get("sc");
  const updateSearchParams = () => {
    const params = new URLSearchParams({ ["c"]: categoryName, ["sc"]: data.value });
    history.replace({ pathname: locationData.pathname, search: params.toString() });
  };

  return (
    <div className={classes.categoryItem} onClick={() => updateSearchParams()}>
      <div
        className={`${classes.categoryItemImageContainer} ${subCategoryName === data.value ? classes.selectedCategory : ""
          }`}
      >
        <img className={classes.categoryImage} src={data.imageUrl} alt={`sub-category-img-${index}`} />
      </div>
      <Typography variant="body1" className={classes.categoryNameTypo}>
        {data.value}
      </Typography>
    </div>
  );
};

const CategoriesComponent = () => {
  const classes = useStyles();
  const history = useHistory();
  const [subCatList, setSubCatList] = useState([]);
  const [page, setPage] = useState(0);
  const locationData = useLocation();
  const { locationData: deliveryAddressLocation } = useContext(SearchContext);
  const useQuery = () => {
    const { search } = locationData;
    return React.useMemo(() => new URLSearchParams(search), [search]);
  };
  let query = useQuery();
  const categoryName = query.get("c");
  const subCategoryName = query.get("sc");
  const searchProductName = query.get("s");

  useEffect(() => {
    if (categoryName) {
      const options = PRODUCT_SUBCATEGORY[categoryName];
      setSubCatList(options || []);
    }
  }, [categoryName, locationData, deliveryAddressLocation]);

  // useEffect(() => {
  //   if (subCategoryName && subCatList.length > 0) {
  //     const findsubCatIndex = subCatList.findIndex((item) => item.value === subCategoryName);
  //     setPage(findsubCatIndex);
  //   }
  // }, [subCategoryName, subCatList, locationData]);

  const rowsPerPage = 7;
  const totalPageCount = Math.ceil(subCatList.length / rowsPerPage);
  return (
    <Grid container spacing={3} className={classes.categoriesRootContainer}>
      <Grid item xs={12} sm={12} md={1.5} lg={1.5} xl={1.5}></Grid>
      <Grid item xs={12} sm={12} md={9} lg={9} xl={9} className={classes.subCatContainer}>
        <div style={{ marginLeft: 'auto', marginTop: 'auto', marginBottom: 'auto' }} className={classes.previousIconContainer}>
          <IconButton
            color="inherit" className={classes.actionButton}
            onClick={() => {
              setPage(page - 1)
              // setActiveSubCatIndex(activeSubCatIndex-1)
            }}
            disabled={page === 0}
          >
            <PreviousIcon />
          </IconButton>
          <div
            className={classes.allOptionsContainer}
            onClick={(e) => {
              e.preventDefault();
              const params = new URLSearchParams({});
              if (searchProductName) {
                params.set("s", searchProductName);
              }
              if (categoryName) {
                params.set("c", categoryName);
              }
              history.replace({ pathname: locationData.pathname, search: params.toString() });
            }}
          >
            <AllIcon />
            <Typography variant="body1" color="primary" className={classes.allNameTypo}>
              All Options
            </Typography>
          </div>
        </div>
        {
          subCatList.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((subCat, subCatIndex) => (
            // <SubCaregoryCard
            //   key={`sub-cat-index-${subCatIndex}`}
            //   data={subCat}
            //   // isActive={subCatIndex === activeSubCatIndex}
            //   onMouseOver={() => {
            //     setActiveSubCatIndex(subCatIndex);
            //   }}
            // />
            <SingleCategory data={subCat} index={subCatIndex} />
          ))
        }
        <div style={{ marginRight: 'auto', marginTop: 'auto', marginBottom: 'auto' }}>
          <IconButton
            color="inherit" className={classes.actionButton}
            onClick={() => {
              setPage(page + 1)
              // setActiveSubCatIndex(activeSubCatIndex+1)
            }}
            disabled={page === (totalPageCount - 1)}
          >
            <NextIcon />
          </IconButton>
        </div>
        {/* <Pagination
          count={subCatList.length}
          page={page}
          className={classes.categoriesContainer}
          boundaryCount={2}
          onChange={(event, page) => {
            const subCat = subCatList[page];
            const params = new URLSearchParams({});
            if (searchProductName) {
              params.set("s", searchProductName);
            }
            if (categoryName) {
              params.set("c", categoryName);
            }
            if (subCategoryName) {
              params.set("sc", subCat.value);
            } else {
            }
            history.replace({ pathname: locationData.pathname, search: params.toString() });
          }}
          renderItem={(item) => {
            if (item.type === "page") {
              const subCatIndex = item.page - 1;
              const subCat = subCatList[subCatIndex];
              return <SingleCategory data={subCat} index={subCatIndex} />;
            } else if (item.type === "next") {
              return (
                <IconButton
                  color="inherit"
                  className={classes.actionButton}
                  onClick={() => {
                    const subCat = subCatList[item.page];
                    const params = new URLSearchParams({});
                    if (searchProductName) {
                      params.set("s", searchProductName);
                    }
                    if (categoryName) {
                      params.set("c", categoryName);
                    }
                    if (subCategoryName) {
                      params.set("sc", subCat.value);
                    } else {
                    }
                    history.replace({ pathname: locationData.pathname, search: params.toString() });
                  }}
                  disabled={subCatList.length === item.page}
                >
                  <NextIcon />
                </IconButton>
              );
            } else if (item.type === "previous") {
              return (
                <div className={classes.previousIconContainer}>
                  <div style={{ margin: "auto" }}>
                    <IconButton
                      color="inherit"
                      className={classes.actionButton}
                      onClick={() => {
                        const subCat = subCatList[item.page];
                        const params = new URLSearchParams({});
                        if (searchProductName) {
                          params.set("s", searchProductName);
                        }
                        if (categoryName) {
                          params.set("c", categoryName);
                        }
                        if (subCategoryName) {
                          params.set("sc", subCat.value);
                        } else {
                        }
                        history.replace({ pathname: locationData.pathname, search: params.toString() });
                      }}
                      disabled={item.page === -1}
                    >
                      <PreviousIcon />
                    </IconButton>
                  </div>

                  <div
                    className={classes.allOptionsContainer}
                    onClick={(e) => {
                      e.preventDefault();
                      const params = new URLSearchParams({});
                      if (searchProductName) {
                        params.set("s", searchProductName);
                      }
                      if (categoryName) {
                        params.set("c", categoryName);
                      }
                      history.replace({ pathname: locationData.pathname, search: params.toString() });
                    }}
                  >
                    <AllIcon />
                    <Typography variant="body1" color="primary" className={classes.allNameTypo}>
                      All Options
                    </Typography>
                  </div>
                </div>
              );
            } else {
              return <PaginationItem {...item} />;
            }
          }}
        /> */}
      </Grid>
      <Grid item xs={12} sm={12} md={1.5} lg={1.5} xl={1.5}></Grid>
    </Grid>
  );
};

export default CategoriesComponent;
