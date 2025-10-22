use axum::Router;

mod routes;

#[tokio::main]
async fn main() {
	let app = Router::new();
	let app = routes::map_all_endpoints(app);

	let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
	axum::serve(listener, app).await.unwrap();
}
