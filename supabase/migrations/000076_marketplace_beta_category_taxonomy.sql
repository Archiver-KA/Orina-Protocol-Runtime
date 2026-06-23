-- ============================================================
-- 000076 - Marketplace beta category taxonomy
-- ============================================================
-- Adds v3.5 beta marketplace categories used consistently by
-- minting, catalog browse/search, and server-side AI listing flows.
-- Real Estate stays disabled until legal/KYC flows are ready.
-- ============================================================

do $$
declare
  payload jsonb := $taxonomy$
[
  {"slug":"physical_goods","parentSlug":null,"nodeType":"asset_class","assetClassSlug":"physical_goods","marketBucket":"physical_goods","sortOrder":10,"isActive":true,"supportsCurrentProtocol":true,"labels":{"en":"Goods"},"aliases":{"en":["goods","physical goods","physical products"]},"metadata":{"legacyCategoryAliases":["goods"]}},
  {"slug":"real_estate","parentSlug":null,"nodeType":"asset_class","assetClassSlug":"real_estate","marketBucket":"real_estate","sortOrder":20,"isActive":false,"supportsCurrentProtocol":false,"labels":{"en":"Real Estate"},"aliases":{"en":["property","real estate"]},"metadata":{"releaseStatus":"coming_soon","legacyCategoryAliases":["property"]}},
  {"slug":"service_rights","parentSlug":null,"nodeType":"asset_class","assetClassSlug":"service_rights","marketBucket":"service_rights","sortOrder":30,"isActive":true,"supportsCurrentProtocol":true,"labels":{"en":"Service"},"aliases":{"en":["service","services","service rights","service entitlement"]},"metadata":{"legacyCategoryAliases":["service","services","service rights"]}},
  {"slug":"agent_services","parentSlug":null,"nodeType":"asset_class","assetClassSlug":"agent_services","marketBucket":"agent_services","sortOrder":35,"isActive":true,"supportsCurrentProtocol":true,"labels":{"en":"Agent Service"},"aliases":{"en":["agent service","agent services","ai agent","ai agents","automation service"]},"metadata":{"legacyCategoryAliases":["agent service","agent services","ai agent","automation"]}},
  {"slug":"digital_assets","parentSlug":null,"nodeType":"asset_class","assetClassSlug":"digital_assets","marketBucket":"digital_assets","sortOrder":40,"isActive":true,"supportsCurrentProtocol":true,"labels":{"en":"Digital Assets"},"aliases":{"en":["digital assets","digital asset","nft","nfts","tokenized assets"]},"metadata":{"legacyCategoryAliases":["digital art","digital asset","digital assets","nft","nfts"]}},
  {"slug":"digital_art","parentSlug":"digital_assets","nodeType":"subcategory","assetClassSlug":"digital_assets","marketBucket":"digital_assets","sortOrder":2000,"isActive":true,"supportsCurrentProtocol":true,"labels":{"en":"Digital Art"},"aliases":{"en":["digital art","digital artwork","nft art"]},"metadata":{"legacySubcategoryAliases":["digital art","digital artwork","nft art"]}},
  {"slug":"digital_media","parentSlug":"digital_assets","nodeType":"subcategory","assetClassSlug":"digital_assets","marketBucket":"digital_assets","sortOrder":2010,"isActive":true,"supportsCurrentProtocol":true,"labels":{"en":"Digital Media"},"aliases":{"en":["digital media","audio asset","video asset","file asset"]},"metadata":{"legacySubcategoryAliases":["digital media","audio asset","video asset","file asset"]}},
  {"slug":"digital_license","parentSlug":"digital_assets","nodeType":"subcategory","assetClassSlug":"digital_assets","marketBucket":"digital_assets","sortOrder":2020,"isActive":true,"supportsCurrentProtocol":true,"labels":{"en":"Digital License"},"aliases":{"en":["digital license","software license","usage license"]},"metadata":{"legacySubcategoryAliases":["digital license","software license","usage license"]}},
  {"slug":"professional_services","parentSlug":"service_rights","nodeType":"subcategory","assetClassSlug":"service_rights","marketBucket":"service_rights","sortOrder":3000,"isActive":true,"supportsCurrentProtocol":true,"labels":{"en":"Professional Services"},"aliases":{"en":["professional services","consulting","legal service","finance service"]},"metadata":{"legacySubcategoryAliases":["professional services","consulting","legal service","finance service"]}},
  {"slug":"technical_services","parentSlug":"service_rights","nodeType":"subcategory","assetClassSlug":"service_rights","marketBucket":"service_rights","sortOrder":3010,"isActive":true,"supportsCurrentProtocol":true,"labels":{"en":"Technical Services"},"aliases":{"en":["technical services","software service","integration service","audit service"]},"metadata":{"legacySubcategoryAliases":["technical services","software service","integration service","audit service"]}},
  {"slug":"creative_services","parentSlug":"service_rights","nodeType":"subcategory","assetClassSlug":"service_rights","marketBucket":"service_rights","sortOrder":3020,"isActive":true,"supportsCurrentProtocol":true,"labels":{"en":"Creative Services"},"aliases":{"en":["creative services","design service","content service","branding service"]},"metadata":{"legacySubcategoryAliases":["creative services","design service","content service","branding service"]}},
  {"slug":"logistics_services","parentSlug":"service_rights","nodeType":"subcategory","assetClassSlug":"service_rights","marketBucket":"service_rights","sortOrder":3030,"isActive":true,"supportsCurrentProtocol":true,"labels":{"en":"Logistics Services"},"aliases":{"en":["logistics services","sourcing service","freight service","inspection service"]},"metadata":{"legacySubcategoryAliases":["logistics services","sourcing service","freight service","inspection service"]}},
  {"slug":"field_services","parentSlug":"service_rights","nodeType":"subcategory","assetClassSlug":"service_rights","marketBucket":"service_rights","sortOrder":3040,"isActive":true,"supportsCurrentProtocol":true,"labels":{"en":"Field Services"},"aliases":{"en":["field services","installation service","maintenance service","repair service"]},"metadata":{"legacySubcategoryAliases":["field services","installation service","maintenance service","repair service"]}},
  {"slug":"education_training","parentSlug":"service_rights","nodeType":"subcategory","assetClassSlug":"service_rights","marketBucket":"service_rights","sortOrder":3050,"isActive":true,"supportsCurrentProtocol":true,"labels":{"en":"Education & Training"},"aliases":{"en":["education","training","course","coaching","workshop"]},"metadata":{"legacySubcategoryAliases":["education","training","course","coaching","workshop"]}},
  {"slug":"seller_agent","parentSlug":"agent_services","nodeType":"subcategory","assetClassSlug":"agent_services","marketBucket":"agent_services","sortOrder":4000,"isActive":true,"supportsCurrentProtocol":true,"labels":{"en":"Seller Agent"},"aliases":{"en":["seller agent","sales agent","listing agent"]},"metadata":{"legacySubcategoryAliases":["seller agent","sales agent","listing agent"]}},
  {"slug":"procurement_agent","parentSlug":"agent_services","nodeType":"subcategory","assetClassSlug":"agent_services","marketBucket":"agent_services","sortOrder":4010,"isActive":true,"supportsCurrentProtocol":true,"labels":{"en":"Procurement Agent"},"aliases":{"en":["procurement agent","sourcing agent","supplier agent"]},"metadata":{"legacySubcategoryAliases":["procurement agent","sourcing agent","supplier agent"]}},
  {"slug":"market_research_agent","parentSlug":"agent_services","nodeType":"subcategory","assetClassSlug":"agent_services","marketBucket":"agent_services","sortOrder":4020,"isActive":true,"supportsCurrentProtocol":true,"labels":{"en":"Market Research Agent"},"aliases":{"en":["market research agent","pricing agent","research agent"]},"metadata":{"legacySubcategoryAliases":["market research agent","pricing agent","research agent"]}},
  {"slug":"operations_agent","parentSlug":"agent_services","nodeType":"subcategory","assetClassSlug":"agent_services","marketBucket":"agent_services","sortOrder":4030,"isActive":true,"supportsCurrentProtocol":true,"labels":{"en":"Operations Agent"},"aliases":{"en":["operations agent","order agent","workflow agent"]},"metadata":{"legacySubcategoryAliases":["operations agent","order agent","workflow agent"]}},
  {"slug":"content_agent","parentSlug":"agent_services","nodeType":"subcategory","assetClassSlug":"agent_services","marketBucket":"agent_services","sortOrder":4040,"isActive":true,"supportsCurrentProtocol":true,"labels":{"en":"Content Agent"},"aliases":{"en":["content agent","translation agent","metadata agent"]},"metadata":{"legacySubcategoryAliases":["content agent","translation agent","metadata agent"]}},
  {"slug":"custom_workflow_agent","parentSlug":"agent_services","nodeType":"subcategory","assetClassSlug":"agent_services","marketBucket":"agent_services","sortOrder":4050,"isActive":true,"supportsCurrentProtocol":true,"labels":{"en":"Custom Workflow Agent"},"aliases":{"en":["custom workflow agent","custom agent","automation package"]},"metadata":{"legacySubcategoryAliases":["custom workflow agent","custom agent","automation package"]}},
  {"slug":"residential_property","parentSlug":"real_estate","nodeType":"subcategory","assetClassSlug":"real_estate","marketBucket":"real_estate","sortOrder":5000,"isActive":false,"supportsCurrentProtocol":false,"labels":{"en":"Residential Property"},"aliases":{"en":["residential property","home property"]},"metadata":{"releaseStatus":"coming_soon","legacySubcategoryAliases":["residential property","home property"]}},
  {"slug":"commercial_property","parentSlug":"real_estate","nodeType":"subcategory","assetClassSlug":"real_estate","marketBucket":"real_estate","sortOrder":5010,"isActive":false,"supportsCurrentProtocol":false,"labels":{"en":"Commercial Property"},"aliases":{"en":["commercial property","office property","retail property"]},"metadata":{"releaseStatus":"coming_soon","legacySubcategoryAliases":["commercial property","office property","retail property"]}},
  {"slug":"rental_rights","parentSlug":"real_estate","nodeType":"subcategory","assetClassSlug":"real_estate","marketBucket":"real_estate","sortOrder":5020,"isActive":false,"supportsCurrentProtocol":false,"labels":{"en":"Rental Rights"},"aliases":{"en":["rental rights","lease rights","rental entitlement"]},"metadata":{"releaseStatus":"coming_soon","legacySubcategoryAliases":["rental rights","lease rights","rental entitlement"]}}
]
$taxonomy$::jsonb;
begin
  insert into public.taxonomy_nodes(
    slug,
    parent_slug,
    node_type,
    asset_class_slug,
    market_bucket,
    sort_order,
    is_active,
    supports_current_protocol,
    labels,
    aliases,
    attribute_template_refs,
    metadata
  )
  select
    jsonb_extract_path_text(node, 'slug'),
    nullif(jsonb_extract_path_text(node, 'parentSlug'), ''),
    jsonb_extract_path_text(node, 'nodeType'),
    jsonb_extract_path_text(node, 'assetClassSlug'),
    jsonb_extract_path_text(node, 'marketBucket'),
    coalesce((jsonb_extract_path_text(node, 'sortOrder'))::integer, 0),
    coalesce((jsonb_extract_path_text(node, 'isActive'))::boolean, true),
    coalesce((jsonb_extract_path_text(node, 'supportsCurrentProtocol'))::boolean, false),
    coalesce(jsonb_extract_path(node, 'labels'), '{}'::jsonb),
    coalesce(jsonb_extract_path(node, 'aliases'), '{}'::jsonb),
    coalesce(array(select jsonb_array_elements_text(jsonb_extract_path(node, 'attributeTemplateRefs'))), '{}'::text[]),
    coalesce(jsonb_extract_path(node, 'metadata'), '{}'::jsonb)
  from jsonb_array_elements(payload) node
  on conflict (slug) do update set
    parent_slug = excluded.parent_slug,
    node_type = excluded.node_type,
    asset_class_slug = excluded.asset_class_slug,
    market_bucket = excluded.market_bucket,
    sort_order = excluded.sort_order,
    is_active = excluded.is_active,
    supports_current_protocol = excluded.supports_current_protocol,
    labels = public.taxonomy_nodes.labels || excluded.labels,
    aliases = public.taxonomy_nodes.aliases || excluded.aliases,
    attribute_template_refs = case
      when cardinality(excluded.attribute_template_refs) > 0 then excluded.attribute_template_refs
      else public.taxonomy_nodes.attribute_template_refs
    end,
    metadata = public.taxonomy_nodes.metadata || excluded.metadata,
    updated_at = now();
end $$;
