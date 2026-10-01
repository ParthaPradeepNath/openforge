import { useEffect } from "react";
import { useNavigate, useLocation, useParams } from "react-router";
import { SessionShell } from "../components/session-shell";


export function Session() {
    const { id } = useParams()

    return (
        <SessionShell onSubmit={() => {}} inputDisabled loading/>
    )

}