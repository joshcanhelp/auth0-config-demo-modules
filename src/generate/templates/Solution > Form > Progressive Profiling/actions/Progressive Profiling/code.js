exports.onExecutePostLogin = async (event, api) => {
  if (event.request.query.action !== "profile_form") {
    return;
  }

  if (event.user.user_metadata?.address_line_1) {
    return;
  }

  api.prompt.render("ap_dcLAcEMXfi1xfHZ5qsfoct");
};

exports.onContinuePostLogin = async (event, api) => {
  const f = event.prompt.fields;
  api.user.setUserMetadata("address", {
    line1: f.address_line_1,
    line2: f.address_line_2 || "",
    zip: f.zip,
    city: f.city,
    state: f.state,
    country: f.country,
  });
};
