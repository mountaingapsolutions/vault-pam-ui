#!/usr/bin/env bash
#

readonly APP_NAME=vault-pam-ui
readonly DB_NAME=vault-pam-db
readonly CURRENT_SCRIPT="$(basename -- ${BASH_SOURCE[0]})"
readonly CURRENT_DIRECTORY="$(cd "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
readonly ENV_VARS=(PAM_DATABASE
                  PAM_DATABASE_USER
                  PAM_DATABASE_PASSWORD
                  PAM_DATABASE_URL
                  PAM_DATABASE_PORT
                  VAULT_API_TOKEN
                  VAULT_DOMAIN
                  SMTP_SERVICE
                  SMTP_USER
                  SMTP_PASS)
# styles
NL=$'\n'
BOLD=$(tput bold)
NORMAL=$(tput sgr0)

print_raw() {
    printf "$*$NL"
}

show_grey () {
    echo -e $BOLD$(tput setaf 7) $@ $NORMAL
}

show_norm () {
    echo -e $BOLD$(tput setaf 15) $@ $NORMAL
}

show_info () {
    echo -e $BOLD$(tput setaf 2) $@ $NORMAL
}

show_warn () {
    echo -e $BOLD$(tput setaf 11) $@ $NORMAL
}

show_err ()  {
    echo -e $BOLD$(tput setaf 9) $@ $NORMAL
}

print_title() {
    print_raw $NL
    show_info "---- ${1:Title} ----"
}

confirm() {
  while true; do
  read -r -n 1 -p "${1:-Continue?} [y/n]: " REPLY
      case $REPLY in
          [yY]) echo; return 0 ;;
          [nN]) echo; return 1 ;;
          *) show_err "Invalid nput"
      esac
  done
}

print_required_env(){
    show_warn "Required environment variables"
    for i in "${ENV_VARS[@]}"
    do
        show_warn "\t${i}"
    done
}

# check all env vars are in .env file
validate_env_file() {
    for i in "${ENV_VARS[@]}"
    do
        ENV_VAL=$(grep -w $i .env | cut -d '=' -f2)
        if [[ -z "${ENV_VAL}" ]]; then
            show_err "${i} not set in ${CURRENT_DIRECTORY}/.env"
            print_required_env
            exit 1
        fi
    done
    show_info "All required environment variables in ${CURRENT_DIRECTORY}/.env are present."
}

# detect .env file
check_env_file() {
    if [ -f "${CURRENT_DIRECTORY}/.env" ]; then
        confirm "${CURRENT_DIRECTORY}/.env file found! Do you want to process this file?" && return 0 || return 1
    fi
}

# accept a question(string) and assign it to a variable
ask() {
    if [[ -z "${!2}" ]]; then
        read -p "${NL}${BOLD}$1${NORMAL}" $2
    fi
}

# Database questions
questions_db() {
    print_title "Database"
    if $(confirm "Are you using an EXTERNAL postgresql database(RDS or any hosted database)?" && return 0 || return 1); then
        ask "Enter database host: " PAM_DATABASE_URL
        ask "Enter database port: " PAM_DATABASE_PORT
        ask "Enter database name: " PAM_DATABASE
        ask "Enter database user: " PAM_DATABASE_USER
        ask "Enter database password: " PAM_DATABASE_PASSWORD
    else
        print_raw $NL
        show_warn "We will now install and create a database."
        # setting the default internal database data
        ask "Enter database password: " PAM_DATABASE_PASSWORD
        INSTALL_DB=yes
        PAM_DATABASE_URL=postgres
        PAM_DATABASE_PORT=5432
        PAM_DATABASE=pam-db
        PAM_DATABASE_USER=hashi_vault_pam_db_user
    fi
}

# PAM questions
questions_pam() {
    print_title "PAM UI"
    ask "Enter pam ui port (Default: 8080): " PORT
    if [[ -z "$PORT" ]]; then
        show_warn "No PORT entered. Using 8080"
        PORT=8080
    else
        # If userInput is not empty show what the user typed in and run ls -l
        show_warn "Using port $PORT"
    fi
    # default
    USE_HSTS=false
}

# Vault questions
questions_vault() {
    print_title "Vault"
    ask "Enter vault domain: " VAULT_DOMAIN
    ask "Enter vault token: " VAULT_API_TOKEN
}

# Email questions
questions_email() {
    print_title "Email"
    ask "Enter email service(gmail for now): " SMTP_SERVICE
    ask "Enter email username: " SMTP_USER
    ask "Enter email password: " SMTP_PASS
}

# Build dist folder
build_dist() {
    print_raw $NL
    show_info "Building dist..."
    npm run build
}

clean_docker() {
    show_info "Cleaning docker images and containers..."
    # stop running container if any
    OLD_CONTAINER="$(docker ps --all --quiet --filter=name="$APP_NAME")"
    if [ -n "$OLD_CONTAINER" ]; then
        show_warn "An existing $APP_NAME container is running. Stopping..."
        docker rm -f $OLD_CONTAINER
    fi
    OLD_DB_CONTAINER="$(docker ps --all --quiet --filter=name="$DB_NAME")"
    if [ -n "$OLD_DB_CONTAINER" ]; then
        show_warn "An existing $DB_NAME container is running. Stopping..."
        docker rm -f $OLD_DB_CONTAINER
    fi
    # purge old images (app)
    docker images -a | grep "${APP_NAME}" | awk '{print $3}' | xargs docker rmi
}

# Run docker container
run_docker() {
    show_info "Running docker..."

    # set default dev env vars
    export PORT=$PORT
    export USE_HSTS=$USE_HSTS

    # if not user .env set env vars based from the user input
    if [ -z "${USE_ENV}" ]
    then
        for ENV_KEY in "${ENV_VARS[@]}"
        do
            ENV_VAL="${!ENV_KEY}"
            export $ENV_KEY=$ENV_VAL
        done
    fi

    COMPOSE_FILE=docker-compose.yml
    if [ -n "${INSTALL_DB}" ]; then
        show_info "Preparing internal DB."
        export POSTGRES_PORT=$PAM_DATABASE_PORT
        export POSTGRES_DB=$PAM_DATABASE
        export POSTGRES_USER=$PAM_DATABASE_USER
        export POSTGRES_PASSWORD=$PAM_DATABASE_PASSWORD
        COMPOSE_FILE=docker-compose-with-db.yml
    fi
    docker-compose -f $COMPOSE_FILE up -d --build

}

# Show running container
finish() {
    show_info "Listing all running docker containers."
    docker ps
    show_info "Sweet! The application will be up soon at https://localhost:${PORT}"
    print_raw $NL
}

# Main function
main() {
    show_info "--------------------------------------------------"
    show_info "---- Welcome to Vault PAM installation script ----"
    show_info "--------------------------------------------------"
    print_raw $NL
    questions_pam
    if check_env_file
    then
        validate_env_file
        USE_ENV=true
    else
        questions_db
        questions_vault
        questions_email
    fi
    build_dist
    clean_docker
    run_docker
    finish
}

if [[ "$0" == "${BASH_SOURCE[0]}" ]]; then
    main "$@"
fi
