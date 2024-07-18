export const formatCustomizations = (customisation_items) => {
  const customizations = customisation_items?.map((customization) => {
    const itemDetails = customization.item_details;
    const parentTag = itemDetails.tags.find((tag) => tag.code === "parent");
    const vegNonVegTag = itemDetails.tags.find((tag) => tag.code === "veg_nonveg");
    const isDefaultTag = parentTag.list.find((tag) => tag.code === "default");
    const isDefault = isDefaultTag?.value.toLowerCase() === "yes";
    const childTag = itemDetails.tags.find((tag) => tag.code === "child");
    const childs = childTag?.list.map((item) => item.value);

    return {
      id: itemDetails.id,
      name: itemDetails.descriptor.name,
      price: itemDetails.price.value,
      inStock: itemDetails.quantity.available.count > 0,
      parent: parentTag ? parentTag.list.find((tag) => tag.code === "id").value : null,
      child: childTag ? childTag.list.find((tag) => tag.code === "id").value : null,
      childs: childs?.length > 0 ? childs : null,
      isDefault: isDefault ?? false,
      vegNonVeg: vegNonVegTag ? vegNonVegTag.list[0].code : "",
    };
  });
  return customizations;
};

export const formatCustomizationGroups = (customisation_groups) => {
  const formattedCustomizationGroups = customisation_groups?.map((group) => {
    const configTags = group.tags.find((tag) => tag.code === "config").list;
    const minConfig = configTags.find((tag) => tag.code === "min").value;
    const maxConfig = configTags.find((tag) => tag.code === "max").value;
    const inputTypeConfig = configTags.find((tag) => tag.code === "input").value;
    const seqConfig = configTags.find((tag) => tag.code === "seq").value;

    const customizationObj = {
      id: group.local_id,
      name: group.descriptor.name,
      inputType: inputTypeConfig,
      minQuantity: parseInt(minConfig),
      maxQuantity: parseInt(maxConfig),
      seq: parseInt(seqConfig),
    };

    if (inputTypeConfig === "input") {
      customizationObj.special_instructions = "";
    }

    return customizationObj;
  });

  return formattedCustomizationGroups;
};

export const getCustomizationGroupsForProduct = (allGroups, ids) => {
  return allGroups.filter((g) => {
    return ids.includes(g.local_id);
  });
};

export const hasCustomizations = (productPayload) => {
  return productPayload.item_details.tags.find((item) => item.code === "custom_group") ? true : false;
  // return productPayload.item_details.tags.find(
  //   (item) => item.code === "custom_group"
  // )
  //   ? productPayload?.customisation_groups?.length > 0
  //   : false;
};

export const initializeCustomizationState_ = async (customizationGroups, customizations, customization_state) => {
  let firstGroup = null;
  for (const group of customizationGroups) {
    if (group.seq === 1) {
      firstGroup = group;
      break;
    }
  }
  if (firstGroup) {
    let currentGroup = firstGroup.id;
    let level = 1;
    const newState = { ...customization_state };

    while (currentGroup) {
      const group = customizationGroups.find((group) => group.id === currentGroup);
      if (group) {
        newState[level] = {
          id: group.id,
          seq: group.seq,
          name: group.name,
          inputType: group?.inputType,
          options: [],
          selected: [],
        };
        newState[level].options = customizations.filter((customization) => customization.parent === currentGroup);

        // Skip selecting an option for non-mandatory groups (minQuantity === 0)
        if (group.minQuantity === 1) {
          const selectedCustomization = newState[level].options.find((opt) => opt.isDefault && opt.inStock);

          // If no default option, select the first available option
          if (!selectedCustomization) {
            newState[level].selected = [newState[level].options.find((opt) => opt.inStock)];
          } else {
            newState[level].selected = [selectedCustomization];
          }
        }

        currentGroup = newState[level].selected[0]?.child || null;
        level++;

        // If a non-mandatory group is encountered, break the loop
        if (group.minQuantity === 0) {
          break;
        }
      } else {
        currentGroup = null;
      }
    }

    return newState;
  }
  return {};
};

export const createCustomizationAndGroupMapping = (customizations) => {
  let newCustomizationGroupMappings = {};
  let customizationToGroupMap = {};
  customizations.forEach((customization) => {
    const groupId = customization.parent;
    const childId = customization.id;

    customizationToGroupMap = {
      ...customizationToGroupMap,
      [customization.id]: customization.childs == undefined ? [] : customization.childs,
    };

    if (!newCustomizationGroupMappings[groupId]) {
      newCustomizationGroupMappings[groupId] = new Set();
    }
    newCustomizationGroupMappings[groupId].add(childId);
  });

  const finalizedCustomizationGroupMappings = {};
  for (const groupId in newCustomizationGroupMappings) {
    finalizedCustomizationGroupMappings[groupId] = Array.from(newCustomizationGroupMappings[groupId]);
  }

  return {
    customizationToGroupMap,
    groupToCustomizationMap: finalizedCustomizationGroupMappings,
  };
};

export function findMinMaxSeq(customizationGroups) {
  if (!customizationGroups || customizationGroups.length === 0) {
    return { minSeq: undefined, maxSeq: undefined };
  }

  let minSeq = Infinity;
  let maxSeq = -Infinity;

  customizationGroups.forEach((group) => {
    const seq = group.seq;
    if (seq < minSeq) {
      minSeq = seq;
    }
    if (seq > maxSeq) {
      maxSeq = seq;
    }
  });

  return { minSeq, maxSeq };
}

export const findSelectedCustomizationForGroup = (group, childCustomizations) => {
  if (!group.isMandatory) return [];
  let defaultCustomization = childCustomizations.filter(
    (customization) => customization.isDefault && customization.inStock
  );

  if (defaultCustomization.length) {
    return defaultCustomization;
  } else {
    return [childCustomizations.find((customization) => customization.inStock)];
  }
};

export const initializeCustomizationState = async (customizationGroups, customizations, customization_state) => {
  const mappings = createCustomizationAndGroupMapping(customizations);
  const customizationToGroupMap = mappings.customizationToGroupMap;
  const minSeq = findMinMaxSeq(customizationGroups).minSeq;
  const firstGroup = customizationGroups.find((group) => group.seq === minSeq);
  customization_state = { firstGroup };

  const processGroup = (id) => {
    const group = customizationGroups.find((item) => item.id === id);
    const groupId = group.id;
    const groupName = group.name;
    const isMandatory = group.minQuantity > 0;

    customization_state[groupId] = {
      id: groupId,
      name: groupName,
      seq: group.seq,
      options: [],
      selected: [],
      childs: [],
      isMandatory,
      type: group.maxQuantity > 1 ? "Checkbox" : "Radio",
    };

    const childCustomizations = customizations.filter((customization) => customization.parent === groupId);

    customization_state[groupId].options = childCustomizations;
    customization_state[groupId].selected = findSelectedCustomizationForGroup(
      customization_state[groupId],
      childCustomizations
    );

    let childGroups =
      customization_state[groupId].selected[0]?.id != undefined
        ? customizationToGroupMap[customization_state[groupId].selected[0]?.id]
        : [];
    customization_state[groupId].childs = childGroups;

    if (childGroups) {
      for (const childGroup of childGroups) {
        processGroup(childGroup);
      }
    }
  };

  if (firstGroup) {
    processGroup(firstGroup.id);
    return customization_state;
  }
};

export function areCustomisationsSame(existingIds, currentIds) {
  if (existingIds.length !== currentIds.length) {
    return false;
  }

  existingIds.sort();
  currentIds.sort();

  for (let i = 0; i < existingIds.length; i++) {
    if (existingIds[i] !== currentIds[i]) {
      return false;
    }
  }

  return true;
}

export const colorCodeToName = {
  "#EDEADE": "alabaster",
  "#EADDCA": "almond",
  "#9F2B68": "amaranth",
  "#FFBF00": "amber",
  "#FBCEB1": "apricot",
  "#00FFFF": "cyan",
  "#7FFFD4": "aquamarine",
  "#454B1B": "army green",
  "#B2BEB5": "ash gray",
  "#F0FFFF": "azure blue",
  "#89CFF0": "baby blue",
  "#F5F5DC": "beige",
  "#F2D2BD": "nude",
  "#000000": "black",
  "#880808": "blood red",
  "#7393B3": "blue gray",
  "#088F8F": "blue green",
  "#0000FF": "blue",
  "#F9F6EE": "bone white",
  "#E1C16E": "brass",
  "#AA4A44": "brick red",
  "#0096FF": "bright blue",
  "#AAFF00": "bright green",
  "#FFAC1C": "bright orange",
  "#BF40BF": "bright purple",
  "#EE4B2B": "bright red",
  "#FFEA00": "bright yellow",
  "#CD7F32": "bronze",
  "#A52A2A": "red brown",
  "#DAA06D": "buff",
  "#800020": "burgundy",
  "#6E260E": "burnt ember",
  "#CC5500": "burnt orange",
  "#E97451": "burnt sienna",
  "#E3963E": "butterscotch",
  "#702963": "byzantium",
  "#5F9EA0": "cadet blue",
  "#097969": "cadmium green",
  "#F28C28": "cadmium orange",
  "#D22B2B": "cadmium red",
  "#FDDA0D": "cadmium yellow",
  "#C19A6B": "fallow",
  "#FFFF8F": "canary yellow",
  "#C41E3A": "cardinal red",
  "#D70040": "carmine",
  "#AFE1AF": "celadon",
  "#DE3163": "cerise",
  "#36454F": "charcoal",
  "#DFFF00": "chartreuse",
  "#D2042D": "cherry",
  "#954535": "chestnut",
  "#7B3F00": "chocolate",
  "#D27D2D": "cinnamon",
  "#E4D00A": "citrine",
  "#811331": "claret",
  "#0047AB": "cobalt blue",
  "#6F4E37": "coffee",
  "#834333": "cognac",
  "#B87333": "copper",
  "#F88379": "coral pink",
  "#FF7F50": "coral",
  "#814141": "cordovan",
  "#6495ED": "cornflower blue",
  "#FFF8DC": "cornsilk",
  "#FFFDD0": "cream",
  "#DC143C": "crimson",
  "#00008B": "dark blue",
  "#5C4033": "dark brown",
  "#A9A9A9": "dark gray",
  "#023020": "dark green",
  "#8B4000": "dark orange",
  "#AA336A": "dark pink",
  "#301934": "dark purple",
  "#8B0000": "dark red",
  "#988558": "dark tan",
  "#8B8000": "dark yellow",
  "#6F8FAF": "denim",
  "#FAD5A5": "desert",
  "#C9A9A6": "dusty rose",
  "#C2B280": "sand",
  "#483248": "eggplant",
  "#F0EAD6": "eggshell",
  "#1434A4": "egyptian blue",
  "#7DF9FF": "electric blue",
  "#50C878": "emerald green",
  "#5F8575": "eucalyptus",
  "#7B1818": "falu red",
  "#E5AA70": "fawn",
  "#4F7942": "fern green",
  "#EEDC82": "flax",
  "#228B22": "forest green",
  "#FF00FF": "magenta",
  "#E49B0F": "gamboge",
  "#9A2A2A": "garnet",
  "#6082B6": "glaucous",
  "#FFD700": "gold",
  "#966919": "golden brown",
  "#FFC000": "golden yellow",
  "#DAA520": "goldenrod",
  "#7CFC00": "grass green",
  "#808080": "gray",
  "#008000": "green",
  "#818589": "gunmetal gray",
  "#FF69B4": "hot pink",
  "#355E3B": "hunter green",
  "#FCF55F": "icterine",
  "#3F00FF": "indigo",
  "#5D3FD3": "iris",
  "#FFFFF0": "ivory",
  "#00A36C": "jade",
  "#F8DE7E": "jasmine",
  "#343434": "jet black",
  "#2AAA8A": "jungle green",
  "#4CBB17": "kelly green",
  "#F0E68C": "khaki",
  "#E6E6FA": "lavender",
  "#FAFA33": "lemon yellow",
  "#1B1212": "licorice",
  "#ADD8E6": "light blue",
  "#C4A484": "light brown",
  "#D3D3D3": "light gray",
  "#90EE90": "light green",
  "#FFD580": "light orange",
  "#FFB6C1": "light pink",
  "#CBC3E3": "light purple",
  "#CF9FFF": "light violet",
  "#AA98A9": "lilac",
  "#32CD32": "lime green",
  "#478778": "lincoln green",
  "#E9DCC9": "linen",
  "#C04000": "mahogany",
  "#FBEC5D": "maize",
  "#0BDA51": "malachite",
  "#F4BB44": "mango",
  "#800000": "maroon",
  "#986868": "marsala",
  "#28282B": "matte black",
  "#915F6D": "mauve taupe",
  "#E0B0FF": "mauve",
  "#191970": "midnight blue",
  "#F3CFC6": "millenial pink",
  "#98FB98": "mint green",
  "#967969": "mocha",
  "#8A9A5B": "sage green",
  "#770737": "mulberry",
  "#FFDB58": "mustard yellow",
  "#FADA5E": "naples yellow",
  "#FFDEAD": "navajo white",
  "#000080": "navy blue",
  "#1F51FF": "neon blue",
  "#0FFF50": "neon green",
  "#FF5F1F": "neon orange",
  "#FF10F0": "neon pink",
  "#FF3131": "neon red",
  "#ECFFDC": "nyanza",
  "#CC7722": "ochre",
  "#FAF9F6": "off white",
  "#808000": "olive green",
  "#353935": "onyx",
  "#FFA500": "orange",
  "#DA70D6": "orchid",
  "#4A0404": "oxblood",
  "#FCF5E5": "parchment",
  "#A7C7E7": "pastel blue",
  "#C1E1C1": "pastel green",
  "#FAC898": "pastel orange",
  "#F8C8DC": "pastel pink",
  "#C3B1E1": "pastel purple",
  "#FAA0A0": "pastel red",
  "#FFFAA0": "pastel yellow",
  "#FFE5B4": "peach",
  "#C9CC3F": "pear",
  "#E2DFD2": "pearl",
  "#B4C424": "peridot",
  "#CCCCFF": "periwinkle",
  "#EC5800": "persimmon",
  "#899499": "pewter",
  "#F89880": "pink orange",
  "#FFC0CB": "pink",
  "#93C572": "pistachio",
  "#E5E4E2": "platinum",
  "#673147": "plum",
  "#E35335": "poppy",
  "#B6D0E2": "powder blue",
  "#A95C68": "puce",
  "#FF7518": "pumpkin orange",
  "#800080": "purple",
  "#51414F": "quartz",
  "#E30B5C": "raspberry",
  "#913831": "red ochre",
  "#FF4433": "red orange",
  "#953553": "red purple",
  "#FF0000": "red",
  "#96DED1": "robin egg blue",
  "#E0BFB8": "rose gold",
  "#C21E56": "rose red",
  "#F33A6A": "rose",
  "#4169E1": "royal blue",
  "#E0115F": "ruby red",
  "#80461B": "russet",
  "#8B4513": "saddle brown",
  "#FF5F15": "safety orange",
  "#F4C430": "saffron",
  "#FA8072": "salmon",
  "#0F52BA": "sapphire blue",
  "#FF2400": "scarlet",
  "#2E8B57": "sea green",
  "#9FE2BF": "seafoam green",
  "#FFF5EE": "seashell",
  "#009E60": "shamrock green",
  "#A0522D": "sienna",
  "#C0C0C0": "silver",
  "#87CEEB": "sky blue",
  "#708090": "slate gray",
  "#848884": "smoke",
  "#00FF7F": "spring green",
  "#4682B4": "steel blue",
  "#71797E": "steel gray",
  "#FA5F55": "sunset orange",
  "#D2B48C": "tan",
  "#F08000": "tangerine",
  "#483C32": "taupe",
  "#008080": "teal",
  "#E3735E": "terra cotta",
  "#D8BFD8": "thistle",
  "#40E0D0": "turqoise",
  "#7C3030": "tuscan red",
  "#630330": "tyrian purple",
  "#F3E5AB": "vanilla",
  "#C4B454": "vegas gold",
  "#A42A04": "venetian red",
  "#40B5AD": "verdigris",
  "#E34234": "vermillion",
  "#7F00FF": "violet",
  "#40826D": "viridian",
  "#E37383": "watermelon pink",
  "#F5DEB3": "wheat",
  "#FFFFFF": "white",
  "#722F37": "wine",
  "#BDB5D5": "wisteria",
  "#FFAA33": "yellow orange",
  "#FFFF00": "yellow",
  "#0818A8": "zaffre",
};
