pipeline {
  agent any

  environment {
    PROJECT_DIR = "${env.WORKSPACE}"
  }

  stages {
    stage('Checkout') {
      steps {
        dir("${env.PROJECT_DIR}") {
          sh 'git reset --hard'
          sh 'git pull origin master'
        }
      }
    }

    stage('Build Docker') {
      steps {
        dir("${env.PROJECT_DIR}") {
          sh 'docker compose down'
          sh 'docker compose build'
        }
      }
    }

    stage('Deploy') {
      steps {
        dir("${env.PROJECT_DIR}") {
          sh 'docker compose up -d'
        }
      }
    }
  }

  post {
    failure {
      echo "❌ Deploy gagal!"
    }
    success {
      echo "✅ Deploy sukses ke https://app.shollu.com"
    }
  }
}
