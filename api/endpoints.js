const got = require("got");

const getReleases = require("../lib/get-releases");
const schemaToEndpoints = require("../lib/schema-to-endpoints");

/**
 * Loads de-referenced OpenAPI specification from @github/openapi via unpkg.com. Caches the response for a year
 *
 * @param {import("@vercel/node").NowRequest} req
 * @param {import("@vercel/node").NowResponse} res
 */
module.exports = async (req, res) => {
  const releases = await getReleases();
  const version = req.query.version || releases[0].version;

  const knownVersions = releases.map((release) => release.version).join(",");
  if (!knownVersions.includes(version)) {
    res.status(404);
    res.json({
      error: `Version "${version}" could not be found. Knonw versions are: ${knownVersions}`,
    });
    return;
  }

  const url = `https://unpkg.com/@github/openapi@${version}/dist/${toJsonFileName(
    req.query.ghe
  )}`;
  console.log(`downloading ${url}`);
  const { body } = await got(url);

  const endpoints = schemaToEndpoints(JSON.parse(body));

  res.setHeader("cache-control", "s-maxage=31536000");
  res.json(endpoints);
};

function toJsonFileName(ghe) {
  if (!ghe) return "api.github.com-deref.json";

  return ghe.replace(/^GHE_(\d)(\d+)/, "ghe-$1.$2-deref.json");
}