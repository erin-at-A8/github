const authToken = process.env.apiKey;
const hubspot = require('@hubspot/api-client');
var axios = require("axios");

exports.main = async (context, sendResponse) => {
  
  const hubspotClient = new hubspot.Client({"accessToken":authToken});
  const headers = {
    'Authorization': `Bearer ${authToken}`
  };
  let product_ids = context.body.products;
  let placements = context.body.placements;
  let deal_id = context.params.deal;
  let url = "https://api.hubapi.com/crm/v3/objects/line_items";
  
  function returnUnique(value, index, array) {
    return array.indexOf(value) === index;
  }
  
  let unique_product_ids = product_ids.filter(returnUnique);
  async function build_line_items() {
    // Create and associate line items to deal
    for (let i = 0; i < unique_product_ids.length; i++) {
      let quantity = parseFloat(product_ids.filter(x => x==product_ids[i]).length);
      let properties = {
        "hs_product_id": `${product_ids[i]}`,
        "quantity": quantity
      };
      const SimplePublicObjectInputForCreate = { properties, associations: [{"to":{"id":`${deal_id}`},"types":[{"associationCategory":"HUBSPOT_DEFINED","associationTypeId":20}]}] };
      async function createLineItems() {
        const {data} = await axios.post(url, SimplePublicObjectInputForCreate, { headers });
      }
      createLineItems()
    }
  }
  
  build_line_items();
  
  async function handle_placements() {
    for (let x = 0; x < placements.length; x++) {
      let placement_id = placements[x].placement;
      let product_id = placements[x].related_product;
      let product_stock = parseFloat(placements[x].product_stock);
      let placement_stock = parseFloat(placements[x].placement_stock);
      let quantity = parseFloat(product_ids.filter(x => x==product_id).length);
      let new_placement_stock = placement_stock - quantity;
      let new_product_stock = product_stock - quantity;
      const updatePlacementUrl = `https://api.hubapi.com/crm/v4/objects/2-13412328/${placement_id}`;
      const updateProductUrl = `https://api.hubapi.com/crm/v4/objects/products/${product_id}`;
      const associatePlacementUrl = `https://api.hubapi.com/crm/v3/objects/2-13412328/${placement_id}/associations/deals/${deal_id}/39`;
      async function updatePlacements() {
        let status = new_product_stock < 1 ? "Reserved in Deal" : "Available";
        let properties = {
          "status": status,
          "stock": new_product_stock
        };
        const data = await axios.patch(updatePlacementUrl, { properties }, { headers });
      }
      async function associatePlacements() {
        const more_data = await axios.put(associatePlacementUrl, {}, { headers });
      }
      async function updateProductStock() {
        let properties = {
          "stock": new_product_stock
        };
        const yet_more_data = await axios.patch(updateProductUrl, { properties }, { headers });
      }
      updatePlacements();
      associatePlacements();
      updateProductStock();
    }
  }
  
  handle_placements();

};