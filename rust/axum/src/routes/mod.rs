use std::sync::Arc;

use axum::{ routing::get, Json, Router };
use utoipa_scalar::{ Scalar, Servable };

use crate::config::AppState;
use crate::config::tracing::create_http_trace_layer;

mod shared;
use shared::{ Response, HandlerResult };

use utoipa::OpenApi;

#[derive(OpenApi)]
#[openapi(paths(openapi_handler, root_handler))]
struct ApiDoc;

/// Return JSON version of an OpenAPI schema
#[utoipa::path(get, path = "/api-docs/openapi.json", responses((status = 200, description = "Hello OpenAPI", body = ())))]
async fn openapi_handler() -> Json<utoipa::openapi::OpenApi> {
	Json(ApiDoc::openapi())
}

pub fn create_router(state: Arc<AppState>) -> Router {
	Router::new()
		.route("/", get(root_handler))
		.route("/api-docs/openapi.json", get(openapi_handler))
		.merge(Scalar::with_url("/scalar", ApiDoc::openapi()))
		.layer(create_http_trace_layer())
		.with_state(state)
}

// async fn root_handler() -> HandlerResult<()> {
#[utoipa::path(get, path = "/", responses((status = 200, description = "Hello world", body = ())))]
async fn root_handler() -> Json<Response<(), ()>> {
	Json(Response {
		success: true,
		message: Some("Hello world!".to_string()),
		..Default::default()
	})
}
