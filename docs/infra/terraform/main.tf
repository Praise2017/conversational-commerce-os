terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = { source = "hashicorp/aws", version = ">= 5.0" }
  }
}

provider "aws" {
  region = var.region
}

# Example skeleton resources (fill in variables appropriately)
# module "vpc" {
#   source = "terraform-aws-modules/vpc/aws"
#   name   = "ccos-vpc"
#   cidr   = "10.0.0.0/16"
# }

# module "eks" {
#   source          = "terraform-aws-modules/eks/aws"
#   cluster_name    = var.cluster_name
#   cluster_version = "1.29"
#   vpc_id          = module.vpc.vpc_id
#   subnet_ids      = module.vpc.private_subnets
# }

# RDS/Aurora PostgreSQL
# resource "aws_rds_cluster" "pg" {
#   engine         = "aurora-postgresql"
#   engine_mode    = "provisioned"
#   engine_version = "15"
# }

# ElastiCache Redis, S3 bucket, Secrets Manager secrets...
