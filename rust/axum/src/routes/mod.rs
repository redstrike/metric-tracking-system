use axum::{ Json, Router, routing::get };

mod shared;
use shared::Response;

pub fn map_all_endpoints(app: Router) -> Router {
	app.route("/", get(root_handler))
}

async fn root_handler() -> Json<Response> {
	Json(Response {
		success: true,
		message: Some("Hello world!".to_string()),
		..Default::default()
	})
}
