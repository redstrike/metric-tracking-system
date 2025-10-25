use std::env;

use mongodb::bson;
use serde::{ Deserialize, Serialize };

pub mod tracing;

#[allow(dead_code)]
#[derive(Debug, Clone)]
pub struct AppMode {
	pub app_env: String,
	pub is_development: bool,
	pub is_staging: bool,
	pub is_production: bool,
}

impl AppMode {
	pub fn from_env() -> Self {
		let app_env = env::var("APP_ENV").expect("[Env] `APP_ENV` must be set");
		let is_development = app_env == "development";
		let is_staging = app_env == "staging";
		let is_production = app_env == "production";
		if !is_development && !is_staging && !is_production {
			panic!("[Env] `APP_ENV` must be set to a valid value: development | staging | production. Actual: {}", app_env);
		}
		AppMode {
			app_env,
			is_development,
			is_staging,
			is_production,
		}
	}
}

#[allow(dead_code)]
#[derive(Debug)]
pub struct AppState {
	pub app_mode: AppMode,
	pub mongodb: MongoDbConfig,
}

#[allow(dead_code)]
#[derive(Debug)]
pub struct MongoDbConfig {
	pub db_name: String,
	pub db_connection_str: String,
	pub client: mongodb::Client,
	pub metrics_collection_name: String,
	pub metrics_collection: mongodb::Collection<MetricDoc>,
}

#[derive(Debug, Deserialize, Serialize, Default)]
pub struct MetricDoc {
	#[serde(rename = "_id")]
	pub id: bson::oid::ObjectId,
	#[serde(rename = "userId")]
	pub user_id: String,
	#[serde(rename = "unitType")]
	pub unit_type: String,
	pub unit: String,
	pub value: f64,
	#[serde(rename = "createdAt")]
	pub created_at: String,
	#[serde(rename = "updatedAt")]
	pub updated_at: String,
	#[serde(rename = "schemaVersion")]
	pub schema_version: i32,
}
