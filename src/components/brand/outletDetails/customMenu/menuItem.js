import React, { useEffect, useState } from "react";
import useStyles from "./style";

import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";

import ItemImage from "../../../../assets/images/item.png";
import VegIcon from "../../../../assets/images/veg.svg";
import NonVegIcon from "../../../../assets/images/nonveg.svg";
import { ReactComponent as CustomiseIcon } from "../../../../assets/images/customise.svg";
import { ReactComponent as PlusIcon } from "../../../../assets/images/plus.svg";
import no_image_found from "../../../../assets/images/no_image_found.png";
import { useHistory } from "react-router-dom";
import { hasCustomizations } from "../../../application/product-list/product-details/utils";
import Loading from "../../../shared/loading/loading";

const MenuItem = (props) => {
  const classes = useStyles();
  const {
    productPayload,
    setProductPayload,
    product,
    productId,
    price,
    bpp_id,
    location_id,
    bpp_provider_id,
    bpp_provider_descriptor,
    show_quantity_button = true,
    onUpdateCart = () => {},
    handleAddToCart,
    setCustomizationModal,
    getProductDetails,
    productLoading,
    isStoreDelivering,
  } = props;
  const { descriptor, isVeg } = product;

  const { name: product_name, images, short_desc: product_description, symbol } = descriptor;
  const history = useHistory();
  const [isProductAvailable, setIsProductAvailable] = useState(true);

  const checkProductDisability = (data) => {
    const itemTags = data.item_details?.time?.label;
    const providerTags = data.provider_details?.time?.label;
    const locationTags = data.location_details?.time?.label;

    const isItemEnabled = itemTags === "enable";
    const isProviderEnabled = providerTags === "enable";
    const isLocationEnabled = locationTags === "enable";

    if (isItemEnabled || isProviderEnabled || isLocationEnabled) {
      setIsProductAvailable(true);
    } else {
      setIsProductAvailable(false);
    }
  };

  useEffect(() => {
    checkProductDisability(productPayload);
  }, [productPayload]);

  const renderVegNonvegIcon = (isVeg) => {
    const tags = product.tags;
    let category = "veg";

    for (let i = 0; i < tags.length; i++) {
      if (tags[i].code === "veg_nonveg") {
        category = tags[i].list[0].code;
      }
    }

    if (category == "veg") {
      return <img src={VegIcon} alt={"veg-icon"} className={classes.vegNonvegIcon} />;
    } else {
      return <img src={NonVegIcon} alt={"nonveg-icon"} className={classes.vegNonvegIcon} />;
    }
  };

  let customGroupTag = productPayload.item_details.tags.find((item) => item.code === "custom_group");

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} sm={12} md={9.5} lg={9.5} xl={9.5}>
        <Typography
          variant="h6"
          className={classes.itemNameTypo}
          style={{ color: isStoreDelivering ? "black" : "lightgrey" }}
        >
          {product_name}
        </Typography>
        <Typography
          variant="h5"
          className={classes.itemPriceTypo}
          style={{ color: isStoreDelivering ? "black" : "lightgrey" }}
        >
          {`₹${
            Number.isInteger(Number(price?.value)) ? Number(price?.value).toFixed(2) : Number(price?.value).toFixed(2)
          }`}
        </Typography>
        <Typography
          variant="h5"
          className={classes.itemDescriptionTypo}
          style={{ color: isStoreDelivering ? "black" : "lightgrey" }}
        >
          {product_description}
        </Typography>
        {!isProductAvailable && (
          <Grid container justifyContent="start">
            <Typography variant="body" color="#D83232">
              Item is unavailable at the moment
            </Typography>
          </Grid>
        )}
      </Grid>
      <Grid item xs={12} sm={12} md={2.5} lg={2.5} xl={2.5}>
        <Card className={classes.itemCard}>
          <img
            className={classes.itemImage}
            src={symbol ? symbol : no_image_found}
            alt={`item-ind-${productId}`}
            style={{ cursor: "pointer" }}
            onClick={() => history.push(`/application/products?productId=${productId}`)}
          />
          {renderVegNonvegIcon(isVeg)}
        </Card>
        <div className={classes.cardAction}>
          <Button
            fullWidth
            variant="outlined"
            color="primary"
            endIcon={productLoading === productId ? null : <PlusIcon />}
            className={classes.addToCartIcon}
            onClick={() => {
              if (hasCustomizations(productPayload)) {
                getProductDetails(productId);
                setCustomizationModal(true);
              } else {
                getProductDetails(productId).then((data) => {
                  handleAddToCart(data, true);
                });
              }
            }}
            disabled={productLoading || !isStoreDelivering || !isProductAvailable}
          >
            {productLoading === productId ? <Loading height="8px" width="8px" /> : "Add to cart"}
          </Button>

          {hasCustomizations(productPayload) && (
            <Button
              fullWidth
              variant="text"
              color="success"
              endIcon={<CustomiseIcon />}
              onClick={() => {
                getProductDetails(productId);
                setCustomizationModal(true);
              }}
              disabled={!isStoreDelivering || !isProductAvailable}
            >
              Customise
            </Button>
          )}
        </div>
      </Grid>
      <Grid item xs={12} sm={12} md={12} lg={12} xl={12}>
        <Box component={"div"} className={classes.divider} />
      </Grid>
    </Grid>
  );
};

export default MenuItem;
