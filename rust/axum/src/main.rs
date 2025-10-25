use std::{ env, sync::Arc };

use mongodb::Client;
use tracing;

mod config;
use config::{ AppMode, AppState, MongoDbConfig, MetricDoc };
use config::tracing::initialize_tracing_subscriber;

mod routes;
use routes::create_router;

#[tokio::main]
async fn main() {
	// Load environment variables from .env file
	dotenvy::dotenv().expect("[Env] .env file must be found");

	// Initialize the global tracing subscriber
	let app_mode = AppMode::from_env();
	initialize_tracing_subscriber(&app_mode);

	// Initialize MongoDB client
	let db_name = env::var("MONGODB_DB_NAME").expect("[Env] `MONGODB_DB_NAME` must be set");
	let db_connection_str = env::var("MONGODB_CONNECTION_STRING").expect("[Env] `MONGODB_CONNECTION_STRING` must be set");
	let mongodb = Client::with_uri_str(&db_connection_str).await.expect("Failed to create MongoDB client");
	let metrics_collection_name = "metrics".to_string();
	let metrics_collection = mongodb.database(&db_name).collection::<MetricDoc>(&metrics_collection_name);

	// Create application state
	let state = Arc::new(AppState {
		app_mode,
		mongodb: MongoDbConfig {
			db_name,
			db_connection_str,
			client: mongodb,
			metrics_collection_name,
			metrics_collection,
		},
	});

	// Create router and start the server
	let app = create_router(state);
	let listener = tokio::net::TcpListener::bind("127.0.0.1:3000").await.expect("Failed to bind to address");
	tracing::info!("Listening on {}", listener.local_addr().unwrap());
	axum::serve(listener, app).with_graceful_shutdown(shutdown_signal()).await.expect("Failed to start server");
}

async fn shutdown_signal() {
	tokio::signal::ctrl_c().await.expect("Failed to register SIGINT signal handler");
	tracing::info!("Received shutdown signal. Starting graceful shutdown...\n");
}
