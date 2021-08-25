import UILoader from '@components/ui-loader'
import { useRouter } from '@hooks/useRouter'
import logo from '@src/assets/images/logo/logo.png'
import { ThemeColors } from '@src/utility/context/ThemeColors'
import '@styles/react/libs/charts/recharts.scss'
import '@styles/react/libs/flatpickr/flatpickr.scss'
import { isObjEmpty } from '@utils'
import moment from 'moment'
import { useContext, useEffect, useState } from 'react'
import { Card, CardBody, Col, Container, FormGroup, Label, Row } from 'reactstrap'
import 'rsuite/dist/styles/rsuite-dark.css'
import * as incidentsService from '../services/incidents'
import BarChart from './BarChart'
import DateRangeSelector from './DateRangeSelector'
import IncidentCountTable from './IncidentCountTable'
import IncidentList from './IncidentList'
import IncidentMap from './IncidentMap'
import StateSelection from './StateSelection'

import { useRouter, routeChange } from '@hooks/useRouter'
import { isObjEmpty } from '@utils'

const Home = () => {
    const router = useRouter()

    const defaultDateRange = isObjEmpty(router.query)
        ? [moment().subtract(1, 'years').toDate(), new Date()]
        : [moment(router.query.from).toDate(), moment(router.query.to).toDate()]

    const [incidents, setIncidents] = useState([])
    const [selectedState, setSelectedState] = useState('')
    const [dateRange, setDateRange] = useState(defaultDateRange)
    const [incidentTimeSeries, setIncidentTimeSeries] = useState([])
    const [incidentAggregated, setIncidentAggregated] = useState([])
    const [loading, setLoading] = useState(false)

    // stats [{'2021-01-02:1}, {'2021-01-01:1}...]  dates descending
    // Remove date out of the range, and insert days that does not have data
    // start_date, end_date: Date
    // monthly: monthly aggregation { first_day_of_month: count_of_the_month }
    const mergeDate = (stats, start_date, end_date, monthly) => {
        const new_stats = []
        let start = moment(start_date)
        const end = moment(end_date)
        const strStartDate = start.format('YYYY-MM-DD')
        const strEndDate = end.format('YYYY-MM-DD')
        while (start <= end) {
            const strDate = start.format('YYYY-MM-DD')
            const monthlyData = monthly[start.format('YYYY-MM')]
            if (stats.length > 0) {
                if (stats[stats.length - 1].key < strStartDate || stats[stats.length - 1].key > strEndDate) {
                    stats.pop()
                    continue //skip data that is out of range
                }
                if (stats[stats.length - 1].key == strDate) {
                    //found the date in stats, use it
                    new_stats.push({
                        monthly_cases: monthlyData,
                        ...stats[stats.length - 1]
                    })
                    stats.pop()
                    continue
                }
            }
            new_stats.push({ key: strDate, value: null, monthly_cases: monthlyData })
            start.add(1, 'days')
        }
        return new_stats
    }
    const loadData = (updateMap = false) => {
        if (dateRange.length != 2) return

        setLoading(true)
        incidentsService
            .getIncidents(dateRange[0], dateRange[1], selectedState)
            .then((incidents) => setIncidents(incidents))
        incidentsService.getStats(dateRange[0], dateRange[1], selectedState).then((stats) => {
            setIncidentTimeSeries(mergeDate(stats.stats, dateRange[0], dateRange[1], stats.monthly_stats))
            if (updateMap) {
                setIncidentAggregated(stats.total)
            }
            setLoading(false)
        })
    }

    useEffect(() => {
        loadData()
    }, [selectedState])
    useEffect(() => {
        loadData(true) //update both incidents and map
    }, [dateRange])

    const { colors } = useContext(ThemeColors)

    // handle date change
    function handleDateRangeSelect(ranges) {
        setDateRange(ranges)

        router.push(`/home?from=${moment(ranges[0]).format('YYYY-MM-DD')}&to=${moment(ranges[1]).format('YYYY-MM-DD')}`)
    }

    function onStateChange(state) {
        setSelectedState(state)
    }
    return (
        <UILoader blocking={loading}>
            <div>
                <Row>
                    <Col xs='12'>
                        <Container>
                            <Row>
                                <Col>
                                    <h4 className='card-title'>
                                        <img src={logo} alt='logo' className='logo' /> Anti-Asian Hate Crime Tracker
                                    </h4>
                                </Col>
                            </Row>
                            <Row>
                                <Col xs='12' sm='auto'>
                                    <FormGroup>
                                        <Label>Location:</Label>{' '}
                                        <StateSelection value={selectedState} onChange={onStateChange} />{' '}
                                    </FormGroup>
                                </Col>
                                <Col xs='12' sm='auto'>
                                    <FormGroup>
                                        <Label>Time Period:</Label>{' '}
                                        <DateRangeSelector onChange={handleDateRangeSelect} value={dateRange} />
                                    </FormGroup>
                                </Col>
                            </Row>
                        </Container>
                    </Col>
                </Row>
                <Row className='match-height'>
                    <Col xl='8' lg='8' md='6' xs='12'>
                        <div>
                            <BarChart
                                color={colors.primary.main}
                                chart_data={incidentTimeSeries}
                                state={selectedState}
                            />
                            <IncidentMap
                                mapData={incidentAggregated}
                                selectdState={selectedState}
                                onChange={onStateChange}
                            />
                            <IncidentCountTable
                                title={'Incident Count by State'}
                                data={incidentAggregated}
                                selectedState={selectedState}
                                stateChanged={(state) => setSelectedState(state)}
                            />
                        </div>
                    </Col>
                    <Col xl='4' lg='4' md='6' xs='12'>
                        <Card>
                            {/* <CardHeader>
                                <CardTitle>Hate Crime Incidents</CardTitle>
                            </CardHeader> */}
                            <CardBody>
                                <IncidentList data={incidents} />
                            </CardBody>
                        </Card>
                    </Col>
                </Row>
            </div>
        </UILoader>
    )
}

export default Home
