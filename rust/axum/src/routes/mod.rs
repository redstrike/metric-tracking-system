use std::sync::Arc;

use axum::{ routing::get, Json, Router };

use crate::config::AppState;
use crate::config::tracing::create_http_trace_layer;

mod shared;
use shared::{ Response, HandlerResult };

pub fn create_router(state: Arc<AppState>) -> Router {
	Router::new().route("/", get(root_handler)).layer(create_http_trace_layer()).with_state(state)
}

async fn root_handler() -> HandlerResult<()> {
	Ok(
		Json(Response {
			success: true,
			message: Some("Hello world!".to_string()),
			..Default::default()
		})
	)
}
