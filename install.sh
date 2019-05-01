#!/usr/bin/env bash
#

readonly APP_NAME=vault-pam-ui
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
        show_warn "We will now install and create a database."
        # setting the default internal database data
        ask "Enter database password: " PAM_DATABASE_PASSWORD
        INSTALL_DB=yes
        PAM_DATABASE_URL=localhost
        PAM_DATABASE_PORT=5434
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
        docker stop $OLD_CONTAINER
    fi
    # purge old images (base)
    docker images -a | grep "mhart/alpine-node" | awk '{print $3}' | xargs docker rmi
    # purge old images (app)
    docker images -a | grep "${APP_NAME}" | awk '{print $3}' | xargs docker rmi

}

# Build docker container
build_docker() {
    print_raw $NL
    show_info "Building docker image."
    if [ -n "$INSTALL_DB" ]; then
        show_info "Preparing internal DB."
        DOCKER_BUILD_ARGS=" --build-arg WITH_DB=yes \
            --build-arg PAM_DATABASE=${PAM_DATABASE} \
            --build-arg PAM_DATABASE_PORT=${PAM_DATABASE_PORT} \
            --build-arg PAM_DATABASE_USER=${PAM_DATABASE_USER} \
            --build-arg PAM_DATABASE_PASSWORD=${PAM_DATABASE_PASSWORD}"
    fi
    show_info "$DOCKER_BUILD_ARGS"
    docker build --no-cache -t $APP_NAME . $DOCKER_BUILD_ARGS
}

# Run docker container
run_docker() {
    # check for param
    DOCKER_RUN_ARGS="-e PORT=$PORT -e USE_HSTS=$USE_HSTS "

    # append the env vars if USE_ENV is set.
    if [ -z "$1" ]
    then
        for ENV_KEY in "${ENV_VARS[@]}"
        do
            ENV_VAL="${!ENV_KEY}"
            DOCKER_RUN_ARGS="${DOCKER_RUN_ARGS}-e ${ENV_KEY}=${ENV_VAL} "
        done
    fi

    show_info "Running docker with these arguments: ${DOCKER_RUN_ARGS}"
    DOCKER_FLAGS="-itd \
        -p ${PORT}:${PORT} \
        -p ${PAM_DATABASE_PORT}:${PAM_DATABASE_PORT} \
        --net=host
        $DOCKER_RUN_ARGS \
        --name ${APP_NAME} \
        --rm ${APP_NAME}"
    show_warn $DOCKER_FLAGS
    docker run $DOCKER_FLAGS
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
    PAM_DATABASE_PASSWORD=test1234
    VAULT_API_TOKEN=s.UEcsthEyqEnQSBBjUIjAIP6W
    VAULT_DOMAIN=https://hashicorp-vault-2092648714.us-east-1.elb.amazonaws.com
    SMTP_PASS=gmail
    SMTP_PASS=notifier@mountaingapsolutions.com
    SMTP_PASS=Eueldx33@mgs
    build_docker
    run_docker $USE_ENV
    finish
}

if [[ "$0" == "${BASH_SOURCE[0]}" ]]; then
    main "$@"
fi